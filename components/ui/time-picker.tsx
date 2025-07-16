"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface TimePickerProps {
  time?: string;
  onTimeChange?: (time: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function TimePicker({
  time,
  onTimeChange,
  placeholder = "Pick a time",
  disabled = false,
}: TimePickerProps) {
  const [selectedHour, setSelectedHour] = React.useState<number | null>(null);
  const [selectedMinute, setSelectedMinute] = React.useState<number | null>(
    null
  );
  const [isAM, setIsAM] = React.useState(true);

  React.useEffect(() => {
    if (time) {
      const [hours, minutes] = time.split(":").map(Number);
      // Convert 24-hour to 12-hour for display
      const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      setSelectedHour(displayHour);
      setSelectedMinute(minutes);
      setIsAM(hours < 12);
    } else {
      setSelectedHour(null);
      setSelectedMinute(null);
      setIsAM(true);
    }
  }, [time]);

  const handleTimeSelect = (hour: number, minute: number) => {
    // Convert 12-hour display format to 24-hour format for output
    let outputHour = hour;
    if (!isAM && hour !== 12) {
      outputHour = hour + 12;
    } else if (isAM && hour === 12) {
      outputHour = 0;
    }

    const formattedHour = outputHour.toString().padStart(2, "0");
    const formattedMinute = minute.toString().padStart(2, "0");
    const timeString = `${formattedHour}:${formattedMinute}`;
    onTimeChange?.(timeString);
  };

  const handleHourClick = (hour: number) => {
    setSelectedHour(hour);
    if (selectedMinute !== null) {
      handleTimeSelect(hour, selectedMinute);
    }
  };

  const handleMinuteClick = (minute: number) => {
    setSelectedMinute(minute);
    if (selectedHour !== null) {
      handleTimeSelect(selectedHour, minute);
    }
  };

  const handleAMPMToggle = () => {
    const newIsAM = !isAM;
    setIsAM(newIsAM);
    if (selectedHour !== null && selectedMinute !== null) {
      handleTimeSelect(selectedHour, selectedMinute);
    }
  };

  const formatDisplayTime = () => {
    if (!time) return placeholder;
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const scrollableContainerStyle = {
    height: "128px",
    width: "64px",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    backgroundColor: "white",
    overflowY: "auto" as const,
    scrollbarWidth: "thin" as const,
    scrollbarColor: "#d1d5db #f3f4f6",
    scrollBehavior: "smooth" as const,
    // Add these properties for better scroll behavior
    position: "relative" as const,
    zIndex: 1,
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !time && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <Clock className="mr-2 h-4 w-4" />
          {formatDisplayTime()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-4">
          <div className="text-sm font-medium text-center">Select Time</div>

          <div className="flex gap-4">
            {/* Hours */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground text-center">
                Hour
              </div>
              <div
                style={scrollableContainerStyle}
                className="scroll-container"
                tabIndex={0}
              >
                {hours.map((hour) => {
                  const isSelected = selectedHour === hour;
                  return (
                    <div
                      key={hour}
                      className={cn(
                        "px-2 py-1 text-center cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors text-sm select-none min-h-[24px] flex items-center justify-center",
                        isSelected && "bg-primary text-primary-foreground"
                      )}
                      onClick={() => handleHourClick(hour)}
                    >
                      {hour}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Minutes */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground text-center">
                Minute
              </div>
              <div
                style={scrollableContainerStyle}
                className="scroll-container"
                tabIndex={0}
              >
                {minutes.map((minute) => {
                  const isSelected = selectedMinute === minute;
                  return (
                    <div
                      key={minute}
                      className={cn(
                        "px-2 py-1 text-center cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors text-sm select-none min-h-[24px] flex items-center justify-center",
                        isSelected && "bg-primary text-primary-foreground"
                      )}
                      onClick={() => handleMinuteClick(minute)}
                    >
                      {minute.toString().padStart(2, "0")}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* AM/PM Toggle */}
          <div className="flex justify-center">
            <div className="flex items-center space-x-1 bg-muted rounded-md p-1">
              <Button
                variant={isAM ? "default" : "ghost"}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={handleAMPMToggle}
              >
                AM
              </Button>
              <Button
                variant={!isAM ? "default" : "ghost"}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={handleAMPMToggle}
              >
                PM
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
