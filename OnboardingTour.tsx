import React from 'react';

interface TourStep {
  title: string;
  description: string;
}

const tourSteps: TourStep[] = [
  { title: 'Welcome', description: 'Welcome to the application!' },
  { title: 'Features', description: 'Learn about our features.' },
  { title: 'Get Started', description: 'How to get started.' },
];

export const OnboardingTour = () => {
  return (
    <div>
      {tourSteps.map((step, index) => (
        <div key={index}>
          <h2>{step.title}</h2>
          <p>{step.description}</p>
        </div>
      ))}
    </div>
  );
};
