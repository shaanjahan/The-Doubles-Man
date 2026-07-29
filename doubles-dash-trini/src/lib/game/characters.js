// Character art for The Doubles Man vendor avatars.
// `avatarEmoji` on a Player record may hold either a URL from here (new players)
// or a legacy emoji string (older records) — renderers should handle both.

export const MALE_CHARACTER = 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/bcc7bb6c4_0F95E854-E641-43E2-BDAD-797DF16B8F23.png';
export const FEMALE_CHARACTER = 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/408c20d1a_9DAEBD4D-3FAD-4D00-8225-CA89648936DB.png';

export const CHARACTERS = [
  { id: 'male', label: 'Male', image: MALE_CHARACTER },
  { id: 'female', label: 'Female', image: FEMALE_CHARACTER },
];

export function characterUrlByGender(gender) {
  return gender === 'female' ? FEMALE_CHARACTER : MALE_CHARACTER;
}

export function isAvatarUrl(value) {
  return typeof value === 'string' && value.startsWith('http');
}