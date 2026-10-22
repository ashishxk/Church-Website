# DCYM Bokaro church website + admin

- `website/`  the public website (floating menu, animated buttons, photo carousel, albums, map, contact form)
- `admin/`    a separate admin site: staff sign in on a phone or computer and edit everything, including photos
- `backend/setup.sql`  the database + photo storage setup for Supabase

Both sites are plain HTML, CSS and JavaScript. No build step. Host each folder free on Netlify, Cloudflare Pages or GitHub Pages (upload `website/` and `admin/` as two separate sites). To preview locally, open `website/index.html` in Visual Studio Code with Live Server.

## One-time setup (about 5 minutes)
Your Supabase project is already connected in `website/data/config.js` and `admin/config.js` (project URL without `/rest/v1`, plus the public anon key).
1. In Supabase open **SQL Editor > New query**, paste all of `backend/setup.sql` and press **Run**. This creates the content table, the contact-message table and the `church-media` photo storage.
2. Open **Authentication > Users > Add user**, enter an email and password, and tick **Auto Confirm User**. In **Authentication > Sign In / Providers** switch off "Allow new users to sign up" so only people you add can edit.
3. Deploy `website/` and `admin/`. Put the website's address into `admin/config.js` as `siteUrl` if you want a "View website" button.

## Using the admin site
Sign in, edit, then press **Save changes**. The public website shows the change within a minute.
- **Moments**: the photo carousel on the home page. Choose many photos at once, add captions.
- **Albums**: press **+ New album**, give it a title, then choose or drop as many photos as you like in one go. The first photo is the cover (press **Cover** on any photo to change it). Visitors tap an album to open a full-screen viewer with thumbnails and swipe.
- **Details**: home page text, featured verse, about us, contact details, **Google Maps embed code** and social links.
- **Events, Leaders, Activities, Notices**: add, reorder and delete items; events, leaders and the carousel accept photos.
- **Messages**: messages sent from the website contact form.

The map shows the CNI Church location by default. To change it paste a new Google Maps embed code in **Details > Contact and map**.

## Notes
- Photos are resized in the browser to a maximum of 1800 px before upload to keep the site fast.
- Removing a photo from an album hides it on the website; the file stays in Supabase storage (Storage > church-media) where you can delete it.
- The anon key is meant to be public. Only users you create can change content; visitors can only read content and send contact messages.
- Colours: navy `#071533`, royal blue `#1F6FE5`, cream `#F3EAD7`, paper `#FAF6EC`, amber `#F2B84B` (taken from the poster).
