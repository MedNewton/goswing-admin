"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/Card";
import { useState, useEffect } from "react";
import { getClientLocale, translate } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n";
import {
  HomeIcon,
  CalendarIcon,
  ShoppingBagIcon,
  UsersIcon,
  StarIcon,
  MusicIcon,
  ChartIcon,
  DollarIcon,
  MapPinIcon,
  SettingsIcon,
  EyeIcon,
} from "@/components/icons";

// ---------------------------------------------------------------------------
// Help sections data
// ---------------------------------------------------------------------------

interface HelpSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  articles: {
    question: string;
    answer: string;
  }[];
}

const HELP_SECTIONS: HelpSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: HomeIcon,
    description: "Learn the basics of setting up and using GoSwing.",
    articles: [
      {
        question: "How do I set up my account?",
        answer:
          "When you first sign up, you'll be guided through an onboarding process. You'll need to provide your organization name, contact information, social media links, and branding assets (logo and cover image). You can also set event policies like refund and age policies during onboarding.",
      },
      {
        question: "What is the Overview dashboard?",
        answer:
          "The Overview dashboard is your home screen. It gives you a quick snapshot of your key metrics: total events, total attendees, tickets sold, average ratings, and total revenue. You'll also see a list of your recent events with quick links to manage them.",
      },
      {
        question: "How do I navigate the app?",
        answer:
          "Use the sidebar on the left to navigate between sections. Hover over it to see the full menu labels. The top header has a quick \"Create Event\" button and access to notifications and your account. At the bottom of the sidebar, you'll find links to your Profile and Settings.",
      },
    ],
  },
  {
    id: "events",
    title: "Managing Events",
    icon: CalendarIcon,
    description: "Create, edit, and manage your events.",
    articles: [
      {
        question: "How do I create a new event?",
        answer:
          'Click the "Create Event" button in the top header or go to Events and click "+ Create Event". Fill in the event details: title, description, date and time, select a venue, and configure your ticket tiers with pricing. You can save it as a draft or publish it immediately.',
      },
      {
        question: "How do I edit an existing event?",
        answer:
          'Go to the Events page, find your event, and click the edit icon (pencil) on the event card. You can also open the event detail page and click "Edit Event" from there. You can update all event information including title, description, dates, venue, and tickets.',
      },
      {
        question: "What are the event statuses?",
        answer:
          "Events can have the following statuses: Published (live and visible to attendees), Draft (not yet visible, still being set up), Completed (event has ended), and Cancelled (event was cancelled). You can filter events by status using the dropdown on the Events page.",
      },
      {
        question: "How do I sort and filter events?",
        answer:
          'On the Events page, use the status dropdown to filter by Published, Draft, Completed, or Cancelled. Use the sort dropdown to order events by date, number of attendees, rating, or title. You can also toggle between grid and list view.',
      },
      {
        question: "What is the Event Overview page?",
        answer:
          'Each event has its own analytics overview. Click "Overview" on an event detail page to see event-specific stats: reservations, check-ins, revenue, song requests, ratings, and tickets sold. You\'ll also see ticket sales breakdown and performance metrics.',
      },
      {
        question: "How do ticket tiers work?",
        answer:
          "Each event can have multiple ticket tiers (e.g., General Admission, VIP). For each tier, set a name, price, and available quantity. You can mark a tier as free or as free for ladies. Ticket tiers help you offer different experience levels at different price points.",
      },
      {
        question: "What are Waitlist, Approval Mode, and Social Sharing?",
        answer:
          "In the event settings: Enable Waitlist allows people to join a waitlist when tickets sell out. Approval Mode (auto/manual) controls whether reservations are automatically approved or require your manual approval. Enable Social Sharing lets attendees share the event on social media.",
      },
      {
        question: "How do I delete an event?",
        answer:
          'On the event detail page, click the "Delete" button. You\'ll be asked to confirm before the event is permanently deleted. Be careful — this action cannot be undone.',
      },
    ],
  },
  {
    id: "venues",
    title: "Venue Management",
    icon: MapPinIcon,
    description: "Set up and manage your venues.",
    articles: [
      {
        question: "How do I create a venue?",
        answer:
          'Go to the Venue section in the sidebar and click "+ New Venue". Fill in the venue name, address, city, country, postal code, venue type (club, bar, restaurant, etc.), and capacity. You can also set the exact location coordinates for map display.',
      },
      {
        question: "How do I edit my venue?",
        answer:
          "Click on your venue from the Venue page to open its detail view. Click the edit button to update any venue information including name, address, capacity, type, and location details.",
      },
      {
        question: "What venue types are available?",
        answer:
          "GoSwing supports several venue types: Club, Bar, Restaurant, Rooftop, Beach Club, Hotel, Concert Hall, Outdoor, and Other. Choose the type that best describes your venue.",
      },
      {
        question: "How is the venue linked to events?",
        answer:
          "When creating or editing an event, you select a venue from your list of venues. The venue's address and location will be automatically associated with the event, including the \"Get Directions\" link for attendees.",
      },
    ],
  },
  {
    id: "orders",
    title: "Orders & Tickets",
    icon: ShoppingBagIcon,
    description: "Track and manage ticket orders.",
    articles: [
      {
        question: "How do I view orders?",
        answer:
          "Go to the Orders section from the sidebar. You'll see a list of all ticket orders across your events, including order details, payment status, and ticket information.",
      },
      {
        question: "What order information is available?",
        answer:
          "Each order shows the attendee name, event, ticket tier, quantity, total amount, payment status, and order date. You can use this to track sales and manage reservations.",
      },
    ],
  },
  {
    id: "attendees",
    title: "Attendee Management",
    icon: UsersIcon,
    description: "Track attendees and check-ins.",
    articles: [
      {
        question: "How do I view my attendees?",
        answer:
          "Go to the Attendees section from the sidebar. You'll see a summary of all attendees across your events, including check-in counts and reservation details.",
      },
      {
        question: "What is the difference between reservations and check-ins?",
        answer:
          "A reservation means someone has a ticket to your event. A check-in means they have actually arrived and been verified at the door. The check-in count helps you track real-time attendance versus expected attendance.",
      },
    ],
  },
  {
    id: "reviews",
    title: "Reviews & Ratings",
    icon: StarIcon,
    description: "Monitor event feedback and ratings.",
    articles: [
      {
        question: "How do I view reviews?",
        answer:
          "Go to the Reviews section from the sidebar. You'll see all reviews left by attendees, along with star ratings. The page shows overall rating statistics and individual review details.",
      },
      {
        question: "What review stats are available?",
        answer:
          "You can see your average rating, total number of reviews, and the rating distribution (how many 1-star through 5-star reviews you have). This helps you understand overall attendee satisfaction.",
      },
    ],
  },
  {
    id: "music",
    title: "Music & Song Requests",
    icon: MusicIcon,
    description: "Manage song suggestions for your events.",
    articles: [
      {
        question: "What is the Music section?",
        answer:
          "The Music section shows song suggestions and requests from your event attendees. This helps DJs and event organizers understand what music the crowd wants to hear.",
      },
      {
        question: "How do song requests work?",
        answer:
          "Attendees can submit song requests through the GoSwing platform. These requests appear in your Music dashboard where you can review them and share with your DJ or music team.",
      },
    ],
  },
  {
    id: "finance",
    title: "Finance & Revenue",
    icon: DollarIcon,
    description: "Track your earnings and financial data.",
    articles: [
      {
        question: "What does the Finance page show?",
        answer:
          "The Finance dashboard gives you a complete financial overview: total transactions, gross revenue, platform fees, and your net profit. It helps you track the financial performance of all your events.",
      },
      {
        question: "How is revenue calculated?",
        answer:
          "Gross revenue is the total amount collected from ticket sales across all events. Fees are the platform charges deducted. Net profit is your gross revenue minus fees — the amount you actually earn.",
      },
    ],
  },
  {
    id: "analytics",
    title: "Analytics & Insights",
    icon: ChartIcon,
    description: "Understand your performance with data.",
    articles: [
      {
        question: "What analytics are available?",
        answer:
          "The Analytics dashboard shows: total events, total attendees, total revenue, and average event rating. You'll also see your top events by attendance, event category distribution, rating distribution, and quick stats like tickets sold and active events.",
      },
      {
        question: "What is the event category distribution?",
        answer:
          "This chart shows how your events are distributed across different categories, with percentage breakdowns. It helps you understand which types of events you organize most frequently.",
      },
    ],
  },
  {
    id: "marketing",
    title: "Marketing",
    icon: EyeIcon,
    description: "Promote your events and reach more attendees.",
    articles: [
      {
        question: "What is the Marketing section?",
        answer:
          "The Marketing section is where you'll be able to create promotional campaigns for your events. This feature is currently coming soon and will include tools for email campaigns, social media promotion, and more.",
      },
    ],
  },
  {
    id: "profile-settings",
    title: "Profile & Settings",
    icon: SettingsIcon,
    description: "Manage your account and preferences.",
    articles: [
      {
        question: "How do I edit my profile?",
        answer:
          'Click "Profile" at the bottom of the sidebar. You can update your name, email, phone number, occupation, and profile picture. Click "Save Profile" to save your changes.',
      },
      {
        question: "How do I change my profile picture?",
        answer:
          'On the Profile page, click "Upload Photo" to select an image from your device. The image should be square and under 5MB. You can also remove your current photo by clicking "Remove".',
      },
      {
        question: "Where are the account settings?",
        answer:
          'Click "Settings" at the bottom of the sidebar, or from the Profile page click any of the settings links. The Settings page has sections for Notifications, Security & Password, Two-Factor Authentication, and Delete Account.',
      },
      {
        question: "How do I edit my venue/establishment profile?",
        answer:
          "Your venue profile (organization name, social links, branding, policies) is managed separately from your personal profile. Go to the Venue section in the sidebar to edit your establishment details.",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Accordion component
// ---------------------------------------------------------------------------

function AccordionItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-4 text-left text-sm font-medium text-gray-900 hover:text-gray-700"
      >
        {question}
        <span
          className={`ml-4 shrink-0 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 6l4 4 4-4" />
          </svg>
        </span>
      </button>
      {open && (
        <p className="pb-4 text-sm leading-relaxed text-gray-600">{answer}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function HelpCenterPage() {
  const [locale, setLocale] = useState<Locale>("fr");
  useEffect(() => { setLocale(getClientLocale()); }, []);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSections = HELP_SECTIONS.filter((section) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      section.title.toLowerCase().includes(q) ||
      section.description.toLowerCase().includes(q) ||
      section.articles.some(
        (a) =>
          a.question.toLowerCase().includes(q) ||
          a.answer.toLowerCase().includes(q),
      )
    );
  });

  const activeData = activeSection
    ? HELP_SECTIONS.find((s) => s.id === activeSection)
    : null;

  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">{translate(locale, "help.title")}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {translate(locale, "help.subtitle")}
        </p>
      </div>

      <div className="mx-auto max-w-4xl space-y-6">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder={translate(locale, "help.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setActiveSection(null);
            }}
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 pl-10 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
          />
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </div>

        {/* Active section detail view */}
        {activeData && !searchQuery.trim() ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setActiveSection(null)}
              className="text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              &larr; {translate(locale, "help.backToTopics")}
            </button>
            <Card>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                  <activeData.icon className="h-5 w-5 text-gray-700" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {activeData.title}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {activeData.description}
                  </p>
                </div>
              </div>
              <div>
                {activeData.articles.map((article) => (
                  <AccordionItem
                    key={article.question}
                    question={article.question}
                    answer={article.answer}
                  />
                ))}
              </div>
            </Card>
          </div>
        ) : (
          <>
            {/* Search results or topic grid */}
            {searchQuery.trim() ? (
              <div className="space-y-4">
                {filteredSections.length === 0 ? (
                  <Card>
                    <p className="text-center text-sm text-gray-500">
                      {translate(locale, "help.noResults")} &quot;{searchQuery}&quot;. {translate(locale, "help.tryDifferent")}
                    </p>
                  </Card>
                ) : (
                  filteredSections.map((section) => {
                    const q = searchQuery.toLowerCase();
                    const matchingArticles = section.articles.filter(
                      (a) =>
                        a.question.toLowerCase().includes(q) ||
                        a.answer.toLowerCase().includes(q),
                    );
                    const articlesToShow =
                      matchingArticles.length > 0
                        ? matchingArticles
                        : section.articles;

                    return (
                      <Card key={section.id}>
                        <div className="mb-4 flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                            <section.icon className="h-4 w-4 text-gray-700" />
                          </div>
                          <h3 className="font-semibold text-gray-900">
                            {section.title}
                          </h3>
                        </div>
                        <div>
                          {articlesToShow.map((article) => (
                            <AccordionItem
                              key={article.question}
                              question={article.question}
                              answer={article.answer}
                            />
                          ))}
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredSections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className="rounded-lg bg-white p-5 text-left shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                      <section.icon className="h-5 w-5 text-gray-700" />
                    </div>
                    <h3 className="font-semibold text-gray-900">
                      {section.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {section.description}
                    </p>
                    <p className="mt-2 text-xs text-gray-400">
                      {section.articles.length}{" "}
                      {section.articles.length === 1 ? translate(locale, "help.article") : translate(locale, "help.articles")}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Contact support */}
        <Card>
          <div className="text-center">
            <h3 className="font-semibold text-gray-900">
              {translate(locale, "help.needMore")}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {translate(locale, "help.needMoreDesc")}
            </p>
            <a
              href="mailto:support@goswing.com"
              className="mt-3 inline-block rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              {translate(locale, "help.contactSupport")}
            </a>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
