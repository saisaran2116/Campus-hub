export function eventArtwork(posterUrl?: string | null, category?: string): string {
  if (posterUrl && posterUrl.split(/[?#]/)[0] !== "/images/image.png") return posterUrl;
  switch (category) {
    case "Technical":
    case "Hackathon":
      return "/images/robotics.jpg";
    case "Cultural":
    case "Fest":
      return "/images/film.jpg";
    case "Workshop":
      return "/images/workshop.jpg";
    default:
      return "/images/campus-life.jpg";
  }
}
