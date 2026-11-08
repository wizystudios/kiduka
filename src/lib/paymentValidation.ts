export function paymentAmountError(amount: number, balance: number) {
  return !Number.isFinite(amount) || amount <= 0 || amount > balance ? 'Kiasi lazima kiwe zaidi ya sifuri na kisizidi deni.' : null;
}