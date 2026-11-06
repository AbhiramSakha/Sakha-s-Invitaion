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
  // Couple photo from your public folder. Paths start with "/" and DON'T include "public".
  // The site tries each path in order, so just keep the file name that matches yours.
  // Optional separate photos from public/ (the Studio can also upload them in your browser)
  brideImg: ['/images/bride.jpg', '/images/bride.jpeg', '/images/bride.png'],
  groomImg: ['/images/groom.jpg', '/images/groom.jpeg', '/images/groom.png'],
  // Show the "Create a video" button on the page? Set to false before sharing with guests.
  showStudioButton: true,
  // Optional video saved in public/videos/
  video: ['/videos/invitation.mp4', '/videos/invitation.webm'],
  // Optional background music file in public/music/ (plays when the invitation is opened). Use music you have rights to.
  bgMusic: '', // e.g. '/music/song.mp3'
  coupleImg: ['/images/Image1.png', '/images/Image1.png', '/images/Image1.png', '/Image1.png', '/Image1.png', '/Image1.png'],
}