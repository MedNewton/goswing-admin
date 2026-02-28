# Venues Feature & Events Fix - Implementation TODO

## 1. Database Changes (SQL - Run in Supabase)
- [x] Add `created_by_user_id` column to venues table
- [x] Create RLS policies for venues (owner insert, select, update, delete)

## 2. Types Updates
- [x] Update `src/types/database.ts` - Add `created_by_user_id` to VenueRow/VenueInsert
- [x] Update `src/types/index.ts` - Add Venue view model type

## 3. Data Layer & Actions
- [x] Create `src/lib/data/venues.ts` - CRUD data functions
- [x] Create `src/lib/actions/venues.ts` - Server actions
- [x] Create `src/lib/mappers/venues.ts` - Venue mapper

## 4. UI Components
- [x] Add MapPinIcon to `src/components/icons/index.tsx`
- [x] Create `src/components/venues/VenueCard.tsx`

## 5. Pages
- [x] Create `src/app/venues/page.tsx` - Venues list page
- [x] Create `src/app/venues/create/page.tsx` - Create venue page

## 6. Sidebar
- [x] Update `src/components/layout/Sidebar.tsx` - Add Venues link

## 7. Event Creation Update
- [x] Update `src/app/events/create/page.tsx` - Replace manual venue input with dropdown
- [x] Update `src/lib/actions/events.ts` - Use existing venue ID

## 8. Events Page Fix
- [ ] Verify events page only shows user's events (RLS should handle this)

## 9. Testing
- [ ] Test venues page loads
- [ ] Test create venue flow
- [ ] Test event creation with venue dropdown
- [ ] Verify events page only shows user's events
