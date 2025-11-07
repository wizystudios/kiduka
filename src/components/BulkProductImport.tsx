import React, { useCallback, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Download } from "lucide-react";

interface ParsedRow {
  name?: string;
  price?: number | string;
  stock_quantity?: number | string;
  barcode?: string;
  category?: string;
  description?: string;
  low_stock_threshold?: number | string;
  is_weight_based?: boolean | string | number;
  unit_type?: string;
  min_quantity?: number | string;
  cost_price?: number | string;
}

const normalizeBoolean = (val: any) => {
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val !== 0;
  if (typeof val === "string") {
    const v = val.trim().toLowerCase();
    return ["1", "true", "yes", "y"].includes(v);
  }
  return false;
};

const toNumber = (val: any, fallback = 0) => {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const n = Number(val.replace?.(/,/g, "") ?? val);
    return isNaN(n) ? fallback : n;
  }
  return fallback;
};

export function BulkProductImport() {
  const { user } = useAuth();
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setRows(results.data as ParsedRow[]);
          toast.success(`Faili la CSV limepakia: ${results.data.length} mistari`);
        },
        error: (err) => {
          console.error(err);
          toast.error("Imeshindwa kusoma faili la CSV");
        },
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheet];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        setRows(json as ParsedRow[]);
        toast.success(`Faili la Excel limepakia: ${(json as ParsedRow[]).length} mistari`);
      };
      reader.onerror = () => toast.error("Imeshindwa kusoma faili la Excel");
      reader.readAsArrayBuffer(file);
    } else {
      toast.error("Tafadhali pakia faili la CSV au Excel");
    }
  }, []);

  const normalized = useMemo(() => {
    return rows
      .map((r) => ({
        name: (r.name ?? "").toString().trim(),
        price: toNumber(r.price, NaN),
        stock_quantity: Math.max(0, Math.floor(toNumber(r.stock_quantity, 0))),
        barcode: r.barcode?.toString().trim() || null,
        category: r.category?.toString().trim() || null,
        description: r.description?.toString().trim() || null,
        low_stock_threshold: Math.max(0, Math.floor(toNumber(r.low_stock_threshold, 10))),
        is_weight_based: normalizeBoolean(r.is_weight_based ?? false),
        unit_type: r.unit_type?.toString().trim() || "piece",
        min_quantity: toNumber(r.min_quantity, 0.1),
        cost_price: toNumber(r.cost_price, 0),
      }))
      .filter((r) => !!r.name && !isNaN(r.price));
  }, [rows]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const downloadTemplate = () => {
    const header = [
      "name,price,stock_quantity,barcode,category,description,low_stock_threshold,is_weight_based,unit_type,min_quantity,cost_price",
    ].join("\n");
    const sample = [
      "Sukari 1kg,3500,20,1234567890123,Vyakula,Sukari ya kilo moja,5,false,piece,1,3000",
      "Mchele 1kg,3200,50,2234567890123,Vyakula,Mchele wa kilo moja,8,false,piece,1,2700",
    ].join("\n");
    const blob = new Blob([header + "\n" + sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "product_import_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importRows = async () => {
    if (!user?.id) {
      toast.error("Haujaingia. Tafadhali ingia kwanza.");
      return;
    }
    if (normalized.length === 0) {
      toast.error("Hakuna mistari halali ya kuingiza.");
      return;
    }

    setLoading(true);
    try {
      // Batch insert in chunks of 100
      const chunkSize = 100;
      for (let i = 0; i < normalized.length; i += chunkSize) {
        const chunk = normalized.slice(i, i + chunkSize).map((r) => ({
          owner_id: user.id,
          name: r.name,
          price: r.price,
          stock_quantity: r.stock_quantity,
          barcode: r.barcode,
          category: r.category,
          description: r.description,
          low_stock_threshold: r.low_stock_threshold,
          is_weight_based: r.is_weight_based,
          unit: r.unit_type, // keep both fields for compatibility if present
          unit_type: r.unit_type,
          min_quantity: r.min_quantity,
          cost_price: r.cost_price,
        }));

        const { error } = await supabase.from("products").insert(chunk);
        if (error) throw error;
      }

      toast.success(`Imefanikiwa: Bidhaa ${normalized.length} zimeingizwa`);
      setRows([]);
      setFileName(null);
      inputRef.current && (inputRef.current.value = "");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Imeshindwa kuingiza bidhaa");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border border-border/50">
      <CardHeader className="p-3">
        <CardTitle className="text-sm">Ingiza Bidhaa kwa Wingi (CSV/Excel)</CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        <div
          className="border-2 border-dashed rounded-md p-4 text-center hover:bg-accent/40 transition"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
        >
          <Upload className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
          <p className="text-xs mb-2">Buruta faili hapa au chagua kutoka kifaa chako</p>
          <div className="flex items-center justify-center gap-2">
            <Input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={onFileChange}
              className="max-w-xs h-8 text-xs"
            />
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="h-8 text-xs">
              <Download className="h-3 w-3 mr-1" /> Pata Template
            </Button>
          </div>
          {fileName && (
            <div className="mt-2 text-xs text-muted-foreground">Faili: {fileName}</div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">Safu zinazosaidiwa</Badge>
          <div className="text-[11px] text-muted-foreground">
            name, price, stock_quantity, barcode, category, description, low_stock_threshold, is_weight_based, unit_type, min_quantity, cost_price
          </div>
        </div>

        {rows.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <p className="text-xs">Mistari iliyopatikana: {rows.length} (halali: {normalized.length})</p>
              </div>
              {normalized.length < rows.length && (
                <div className="flex items-center gap-1 text-orange-600 text-xs">
                  <AlertTriangle className="h-4 w-4" />
                  Baadhi ya mistari itapita kwa sababu ya data pungufu/kosa
                </div>
              )}
            </div>

            {/* Preview table */}
            <div className="overflow-auto border rounded-md">
              <table className="w-full text-xs">
                <thead className="bg-muted/40">
                  <tr>
                    {Object.keys(normalized[0] || { name: "", price: "" }).map((key) => (
                      <th key={key} className="text-left px-2 py-1 capitalize">{key.replace(/_/g, " ")}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {normalized.slice(0, 5).map((row, idx) => (
                    <tr key={idx} className="border-t">
                      {Object.values(row).map((val, i) => (
                        <td key={i} className="px-2 py-1 whitespace-nowrap">{String(val)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2 justify-end">
              <Button onClick={importRows} disabled={loading || normalized.length === 0} className="h-8 text-xs">
                {loading ? "Inaingiza..." : "Ingiza Bidhaa"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-muted-foreground">
            Dokezo: Hakikisha vichwa vya safu vinafanana na template ili kuepuka makosa.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default BulkProductImport;
