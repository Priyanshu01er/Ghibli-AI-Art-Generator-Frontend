/**
 * Copy for `components/LegalPage`, kept next to `homeData.js` so the page file stays layout.
 *
 * Every factual claim here is taken from this codebase rather than from a boilerplate
 * template, and each one names its source — so if the backend changes, the sentence that
 * stops being true is findable.
 */

/** Shown in the hero. Bump this whenever a clause below changes. */
export const legalUpdatedAt = '27 August 2026';

export const termsClauses = [
  {
    title: 'What Ghibli AI does',
    body:
      'Ghibli AI turns a photo you upload, or a sentence you type, into a new Ghibli-style image. Those are the only two things it does: Photo to Art takes an image plus a short description, and Text to Art takes a description plus one of six style presets. Everything else on the site — the gallery, the history page — is there to show you work that has already been generated.',
  },
  {
    title: 'Your account',
    body:
      'You need an account to generate anything, because every image is filed under the person who made it. One account per e-mail address; sign up with a name, an e-mail and a password. You are responsible for what happens under your account, so keep the password to yourself. If you are under 13, please do not sign up.',
  },
  {
    title: 'What you may upload',
    body:
      'Only images you have the right to use — your own photos, or ones you have permission for. Do not upload other people to be transformed without their say-so, and nothing illegal, hateful, or sexual. Uploads are capped at 5 MB per image, which is enough for a full-resolution phone photo.',
  },
  {
    title: 'Who owns what',
    body:
      'Your photo stays yours; we claim nothing in it. The image the generator returns is yours too — keep it, post it, sell it. We store a copy under your account so you can find it again later, and it stays there until you delete it. We do not put your work in the gallery or use it to advertise the site.',
  },
  {
    title: 'Not affiliated with Studio Ghibli',
    body:
      'This is an independent project. It is not made by, endorsed by, or connected to Studio Ghibli, Hayao Miyazaki, or anyone who works with them. "Ghibli-style" here describes an aesthetic — warm light, painted backgrounds, soft colour — and nothing more. Every Ghibli film title, character and trademark belongs to its owner, and the style names in the Text to Art dropdown are descriptive labels for that look.',
  },
  {
    title: 'The generator is somebody else’s model',
    body:
      'The actual image is produced by Stability AI’s SDXL model, which we call over the network. That means two honest caveats: the same prompt will not give you the same picture twice, and if their service is slow, down, or refuses a prompt, so are we. We do not promise the site is available, and there is no queue you can pay to skip.',
  },
  {
    title: 'Provided as-is, and what we are liable for',
    body:
      'The service comes with no warranty of any kind. A generation can fail, and an image can be lost to a bug, a failed write, or a deploy — so if a result matters to you, press Download and keep your own copy. To the extent the law allows, we are not liable for indirect or consequential loss, and our total liability is limited to what you have paid us, which is nothing.',
  },
  {
    title: 'Changes, and how to reach us',
    body:
      'These terms can change as the project does; the date at the top of this page is when they last did, and continuing to use the site after that is how you accept the new version. Questions, takedowns and bug reports all go to the same place — the contact details on the project repository.',
  },
];

export const privacyClauses = [
  {
    title: 'Your account details',
    body:
      'Three fields: the name you signed up with, your e-mail address stored in lower case so "A@b.com" and "a@b.com" cannot become two accounts, and a BCrypt hash of your password. The hash is one-way — nobody here, including us, can read your password back out of it.',
  },
  {
    title: 'What is saved for each generation',
    body:
      'The prompt exactly as you typed it, the style preset you chose, which model produced the image, the finished PNG, its width, height and byte size, and the moment it was created. That record lives in MongoDB Atlas and is what History reads; the metadata and the image bytes are stored as two separate documents.',
  },
  {
    title: 'Who else sees your prompt',
    body:
      'Stability AI does, because they run the model. For Text to Art that is your description and the style preset; for Photo to Art it is your description and the photo itself, sent once to perform that transformation. Their handling of it is governed by their own policy. Nothing is sent anywhere else — there is no analytics service, no advertising network and no third-party tracker on this site.',
  },
  {
    title: 'How you stay signed in',
    body:
      'Logging in gives your browser a signed token that is valid for 24 hours and is kept in this site’s localStorage. That is a deliberate trade-off: it survives a refresh, but any script running on this origin could read it, so a token is never worth more than one day. Your most recent generated image is now kept in the same place, so it is still on screen when you switch tabs or reload — it is removed when you press Create Another or log out.',
  },
  {
    title: 'Your controls',
    body:
      'Delete on any card in History removes both the metadata and the image bytes, immediately and permanently — there is no recycle bin, so download anything you want to keep first. Logging out clears the token and the locally-stored image from this browser. Clearing site data in your browser does the same thing by hand.',
  },
  {
    title: 'How long things are kept',
    body:
      'Generations stay until you delete them. There is no automatic expiry, no archive tier and no scheduled clean-up job that will quietly remove your older work.',
  },
  {
    title: 'Keeping it separate, and safe',
    body:
      'Every history request is scoped to the account that made it, so one signed-in user cannot read, download or delete another’s generations even by guessing an id — an id belonging to somebody else answers 404, not 403. Passwords are hashed, tokens are signed and expire on their own, and the database is not reachable from the browser.',
  },
  {
    title: 'Changes, and how to reach us',
    body:
      'If what we store changes, this page changes with it and the date at the top moves. For a question about your data, or to have an account removed entirely, use the contact details on the project repository.',
  },
];

/** The creative beat in the privacy half: two columns, same visual weight. */
export const privacyStored = [
  'Your name and e-mail address',
  'A one-way BCrypt hash of your password',
  'The prompt and style you chose',
  'The generated PNG, with its size and dimensions',
  'The date and time of each generation',
];

export const privacyNeverStored = [
  'The photo you upload for Photo to Art',
  'Your password, in any readable form',
  'Payment or card details — nothing is charged',
  'Advertising, analytics or fingerprinting data',
  'Anything about you from other websites',
];
