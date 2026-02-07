"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { Button } from "@/components/ui/Button";
import { useState } from "react";

export default function CreateEventPage() {
  const [publishEvent, setPublishEvent] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(true);
  const [localSharing, setLocalSharing] = useState(true);

  return (
    <MainLayout
      title="Create New Event"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            Cancel
          </Button>
          <Button variant="primary" size="sm">
            Create Event
          </Button>
        </div>
      }
    >
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Event Image */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            📷 Event Image
          </h2>
          <div className="flex items-center gap-4">
            <div className="h-32 w-32 overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
              <div className="flex h-full items-center justify-center text-gray-400">
                <span className="text-4xl">+</span>
              </div>
            </div>
            <div>
              <Button variant="outline" size="sm">
                Choose Image
              </Button>
              <p className="mt-2 text-sm text-gray-500">
                Upload event image
              </p>
              <p className="text-xs text-gray-400">
                Recommended: 1200 x 800px
              </p>
            </div>
          </div>
        </Card>

        {/* Event Details */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            📝 Event Details
          </h2>
          <div className="space-y-4">
            <Input label="Event Title" placeholder="e.g., Summer Jazz Night" />
            <Textarea
              label="Description"
              placeholder="Describe your event..."
              rows={4}
            />
            <Select
              label="Category"
              options={[
                { value: "", label: "Select a category" },
                { value: "music", label: "Music" },
                { value: "food", label: "Food & Drink" },
                { value: "business", label: "Business" },
                { value: "sports", label: "Sports" },
                { value: "other", label: "Other" },
              ]}
            />
          </div>
        </Card>

        {/* Date & Time */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            📅 Date & Time
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Event Date" type="date" />
            <Input label="Start Time" type="time" />
            <Input label="End Date" type="date" />
            <Input label="End Time" type="time" />
          </div>
        </Card>

        {/* Location */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            📍 Location
          </h2>
          <div className="space-y-4">
            <Input label="Venue Name" placeholder="e.g., Jazz Club Downtown" />
            <Input label="Capacity" type="number" placeholder="Maximum attendees" />
            <Textarea
              label="Full Address"
              placeholder="Street address, city, postal code"
              rows={3}
            />
          </div>
        </Card>

        {/* Pricing */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            💰 Pricing
          </h2>
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Standard Ticket</h3>
                <Button variant="ghost" size="sm">
                  Remove
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input placeholder="Ticket Name" defaultValue="Standard" />
                <Input placeholder="Price" type="number" defaultValue="25" />
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-medium text-gray-900">VIP Ticket</h3>
                <Button variant="ghost" size="sm">
                  Remove
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input placeholder="Ticket Name" defaultValue="VIP" />
                <Input placeholder="Price" type="number" defaultValue="50" />
              </div>
            </div>

            <Button variant="outline" size="sm">
              + Add Ticket Tier
            </Button>
          </div>
        </Card>

        {/* Event Settings */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            ⚙️ Event Settings
          </h2>
          <div className="space-y-4">
            <Toggle
              label="Publish Event"
              checked={publishEvent}
              onChange={setPublishEvent}
            />
            <Toggle
              label="Payment Method"
              checked={paymentMethod}
              onChange={setPaymentMethod}
            />
            <Toggle
              label="Enable Local Sharing"
              checked={localSharing}
              onChange={setLocalSharing}
            />
          </div>
        </Card>

        {/* Contact Information */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            📧 Contact Information
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Contact Email" type="email" placeholder="event@example.com" />
            <Input label="Contact Phone" type="tel" placeholder="+33 1 23 45 67 89" />
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button variant="outline">Cancel</Button>
          <Button variant="primary">Create Event</Button>
        </div>
      </div>
    </MainLayout>
  );
}
