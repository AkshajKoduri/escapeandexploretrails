## Replace AI images with user uploads + sourced trek photos

### What's changing
- **Hero**: untouched (`src/assets/hero.jpg`)
- **"Your Next Adventure Awaits" (Treks section)**: untouched for now per your instruction, BUT you also asked to source real photos from the internet for these. I'll fetch authentic-looking landscape photos from Unsplash for each of the 6 treks (Ahobilam, Bhongir Fort, Ananthagiri, Koilkonda, Ethipothala Falls, Medak Fort).
- **About section** (`about.jpg`): replace with one of your group photos (likely image-2.png — group under the arch with the Escape & Explore logo, very on-brand)
- **Gallery section** (`gallery-1.jpg` … `gallery-6.jpg`): replace with 6 unique uploaded photos
- **Footer thumbnails**: automatically update since they re-use the same gallery images

### Mapping (no repeats)

| Slot | Source |
|------|--------|
| about.jpg | image-2.png (group at fort arch with logo) |
| gallery-1.jpg (tall) | image.png (waterfall cave group — stunning hero-style shot) |
| gallery-2.jpg | image-3.png (trek briefing at trailhead) |
| gallery-3.jpg | image-7.png (group at rock paintings) |
| gallery-4.jpg (tall) | image-5.png (hiker in rock crevice — vertical format perfect for tall slot) |
| gallery-5.jpg | image-8.png (misty cliff edge) |
| gallery-6.jpg | image-4.png (group on fort ramparts) |
| (held back) | image-6.png, image-9.png — saved for any new uploads or later sections |

### Trek section (sourced from Unsplash / web)
Replace these 6 with real, license-free photos that match each location:
- `trek-bhongir.jpg` → Bhongir Fort monolith
- `trek-ahobilam.jpg` → Nallamala forest / Ahobilam temple hill
- `trek-ananthagiri.jpg` → Ananthagiri misty hills
- `trek-koilkonda.jpg` → Deccan fort ruins
- `trek-ethipothala.jpg` → Ethipothala waterfall
- `trek-medak.jpg` → Medak fort/cathedral hilltop

Since specific landmark photos may be hard to license-clear, I'll prioritize correct, authentic photos where available and use closely matching Telangana/AP landscape photos otherwise. I'll tell you what I used per slot.

### Technical notes
- Copy uploaded images directly into `src/assets/` overwriting existing files, preserving filenames so no component code needs to change.
- For sourced trek photos, download via `curl` into `src/assets/`.
- Resize/crop with ImageMagick (via nix) to reasonable dimensions (~1600px wide, optimized JPG) so the page stays fast.
- Hero, Treks card layout, Gallery layout, all component code: untouched.

### You mentioned more images coming
I'll wait for your next batch before finalizing. If you upload more, I'll slot them into the held-back gallery positions or use them to push less-fitting ones out — still no repeats.

### Confirm
Approve this and I'll:
1. Replace About + 6 Gallery images with your uploads
2. Source and replace the 6 Trek images from the web
3. Report back with what I sourced for each trek so you can swap any you don't like