"use client";

import React from 'react';
import { Button } from "@/components/ui/button";

interface DialogErrorFallbackProps {
  onCloseDialog?: () => void;
}

export const DialogErrorFallback: React.FC<DialogErrorFallbackProps> = ({ onCloseDialog }) => {
  return (
    <div className="py-8 text-center"> {/* Increased padding for better spacing */}
      <h3 className="text-lg font-semibold mb-3 text-card-foreground">Details Unavailable</h3>
      <p className="text-sm text-muted-foreground mb-6">
        An error occurred while trying to display the token information.
        You can try closing and reopening this dialog.
      </p>
      {onCloseDialog && (
        <Button onClick={onCloseDialog} variant="outline">
          Close Dialog
        </Button>
      )}
    </div>
  );
}; 