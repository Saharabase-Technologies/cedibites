# Release walkthrough: orders, the till and the boards

Drafted 2026-09-02. Not sent yet.

Covers everything shipped between `decdf96` (2026-08-28) and `9f8bffe` (2026-09-02), all of it on
prod. Nothing has ever been sent to staff through the walkthrough. This is the first one, so it
carries the whole batch rather than only the newest commit.

Written to the house rules in the global `CLAUDE.md`. No dashes. One idea per sentence. Nothing
explained twice. No version numbers and no bug list.

---

## A. The till

`release_key`: `orders-and-till-2026-09`
Subject: **Online orders now come to the till**
Audience: Sales staff, Call centre, Branch managers, plus admins by name. 8 slides.

### 1. Online orders now come to your till
An order placed on the website used to stop at the website. It now lands on your Orders screen the
moment it arrives. A banner and a chime tell you, even while you are mid-sale.
*Screenshot: the arrival banner, top right of the till.*

### 2. Accept an order to make it yours
An online order arrives with nobody's name on it. Tapping Accept puts yours there. The order
becomes your responsibility, and the sale counts towards your own figures for the day.
*Screenshot: an arrival card showing View and Accept.*

### 3. Receipts are printed at the Order Manager
The Print button has left the till's confirmation screen. Every order lands on the board, including
one you rang up yourself, and the slip prints from its ticket. One place a receipt can come from
means nobody is handed a second original.
*Screenshot: a ticket on the board with the gold printer beside the stage button.*

### 4. A gold printer means the slip is still owed
The printer sits on the ticket while the receipt is outstanding. It disappears once the slip exists.
A column with no printers in it has nothing left to hand over.

### 5. Another copy comes from the Orders screen
Reprints are where they have always been. Open Orders, find the order, press Reprint. The button
only appears once a receipt exists. If it is not there, the customer has not been given one yet.

### 6. A finished order that never got its slip
The board only carries work up to Ready, so an order completed without printing has dropped off it.
Print that one from Orders. It is the only order on that screen whose button appears with no receipt
behind it. It still says Reprint, and the tooltip tells you it was never printed at the pass.

### 7. Revenue, Cash and MoMo answer three questions
Revenue is what you sold. Cash is what should be in the drawer. MoMo went through the gateway and
never touched it. At close of day, count the drawer against Cash.
*Screenshot: the header figure strip.*

### 8. The Orders screen was rebuilt
Search and sortable columns. Tap a row to open its items and notes. Three tabs: Mine is your own
day, Online is what arrived from the website, All is the branch. Supervisors open on All.
*Screenshot: the orders table showing the tabs.*

---

## B. The kitchen and the Order Manager

`release_key`: `boards-2026-09`
Subject: **What changed on the boards**
Audience: Kitchen, Branch managers. 6 slides.

### 1. A late ticket now calls its number
The board says "#1042 has been cooking 16m". It no longer says "3 orders are late". You know which
pan. Late tickets get a lower tone that repeats once a minute. An order nobody has accepted still
escalates to the alarm.

### 2. Both screens announce an order at the same moment
The Kitchen Display and the Order Manager share one sound and one clock. An order is announced once,
when it arrives.

### 3. Drinks are dimmed
A line the kitchen has nothing to do with is dimmed and tagged "no prep". It is still part of the
order and still has to be handed over. It just stops competing with what needs a pan.

### 4. The stage clock restarts when you move a ticket
Time in the current stage is the big number. The order's total age sits small underneath it. Move a
ticket to Cooking and the cooking clock starts at zero, on every screen, and it survives a reload.

### 5. Cancel requests are a row of cards
They sit in a line above the board. Each card carries the number, the name, the reason and the age.
Keep and Cancel it are both on the card. Tap it for the items, the note and the timeline.

### 6. Muting the alarm is a supervisor's call
The alerts exist because orders were being missed. Only managers and admins can mute or snooze them.
The button stays on everyone's screen so it never looks broken.

---

## Before sending

1. **Take the screenshots** on the live app. Six are marked above. JPG, PNG or WebP, under 5MB.
2. **Check the images load.** A slide whose screenshot fails now closes over the gap and reads as a
   text slide, so a broken upload is quiet rather than obvious. Page through your own copy once
   before trusting it.
3. **The release name is the one way door.** `release_key` is unique and the API rejects a repeat.
   On a kind that keeps interrupting until acknowledged, sending twice is not cosmetic.
4. **Set the SMS fallback minutes** for anyone who will not sign in soon. 11 of 16 staff have no
   email.
5. Beta and prod hold separate databases, so a key spent testing on staging is still free on prod.

## Sending

Open `/admin/messages`, press **Message staff**, choose kind **What's new**. Fill in the release
name and subject. Add one slide per section above, with its screenshot. Pick the audience and read
the live reach count. Send.
