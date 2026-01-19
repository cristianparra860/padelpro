
const dt = '2026-01-21';
const url = `http://localhost:9002/api/timeslots?date=${dt}&timeSlotFilter=all&viewPreference=all`;

console.log('Fetching:', url);

async function run() {
    try {
        const res = await fetch(url);
        console.log('Status:', res.status);
        if (res.ok) {
            const data = await res.json();
            const slots = data.slots || data;
            console.log('Slots length:', slots.length);
            if (slots.length === 0) {
                console.log('No slots found. Possible reasons: Date mismatch, Club match, or Filtering.');
            } else {
                console.log('First slot:', JSON.stringify(slots[0], null, 2));
            }
        } else {
            console.log('Error text:', await res.text());
        }
    } catch (err) {
        console.error('Fetch error:', err);
    }
}

run();
