
import React from 'react';

const EventsTableLoading = () => {
  return (
    <div className="w-full p-8 flex justify-center">
      <div className="animate-pulse flex flex-col w-full space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-muted rounded"></div>
        ))}
      </div>
    </div>
  );
};

export default EventsTableLoading;
