// Edit your wedding details here.
export const WEDDING = {
  date: new Date(2026, 11, 13, 0, 0, 0), // 13 Dec 2026 (month is 0-based)
  bride: 'Sakha Ganga Uma Maheswari',
  groom: 'Burra Venkatesh',
  venue: 'Surya Convention Hall',
  address: 'Near Lorry Stand, Samalkot',
  state: 'Andhra Pradesh',

  // Wedding day (shown clearly on the page)
  dayName: 'Sunday',
  dateText: '13 December 2026',
  time: '', // e.g. '10:30 AM' (leave empty to hide)

  // Photos live in the "public" folder. Paths start with "/" and DON'T include "public".
  // Names are case-sensitive on the cloud: "Image1.png" is not "image1.png".
  coupleImg: ['/images/Couple.png'],

  // Optional separate photos. Leave them if you don't have any.
  brideImg: ['/images/Image1.png', '/images/Image1.png', '/images/Image1.png'],
  groomImg: ['/images/Image2.png', '/images/Image2.png', '/images/Image2.png'],

  // No separate bride/groom photo? The cards then show a zoomed part of the couple photo.
  // pos = which part of the photo ("left top" as x% y%), zoom = how close (1 = whole photo).
  brideCrop: { pos: '15% 30%', zoom: 1.7 },
  groomCrop: { pos: '85% 25%', zoom: 1.7 },

  // Show the "Create a video" button on the page? Set to false before sharing with guests.
  showStudioButton: true,

  // Optional video saved in public/videos/
  video: [],

  // Optional background music file in public/music/ (plays when the invitation is opened).
  bgMusic: '', // e.g. '/music/song.mp3'
}