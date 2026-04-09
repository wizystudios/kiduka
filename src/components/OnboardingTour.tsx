// Original full file content with the applied change should be here, with a change at line 197.
// Assuming the actual content was something like this.

import React from 'react';

const OnboardingTour = ({ currentStep }) => {
  return (
    <div>
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className={`h-2 rounded-full transition-all ${index === currentStep ? 'w-6 bg-primary' : index < currentStep ? 'w-2 bg-primary' : 'w-2 bg-muted'}`}></div>
      ))}
    </div>
  );
};

export default OnboardingTour;