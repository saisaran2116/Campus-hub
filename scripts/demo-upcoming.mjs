import { PrismaClient } from "@prisma/client";

if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") throw new Error("Enable demo mode on a local database first.");

const prisma = new PrismaClient();
const examples = [
  { posterUrl: "/images/robotics.jpg", title: "Robotics lab open house", category: "Technical", venue: "Innovation Lab 304", description: "Meet the robotics team and try the student-built rover." },
  { posterUrl: "/images/film.jpg", title: "Campus film night", category: "Cultural", venue: "Amphitheatre Lawn", description: "Bring a blanket for a screening of student short films." },
  { posterUrl: "/images/workshop.jpg", title: "Portfolio workshop", category: "Workshop", venue: "Design Studio 402", description: "Bring a project and get feedback on how you present it." },
];

try {
  const organizer = await prisma.user.findUniqueOrThrow({ where: { email: "robotics@campus.edu" } });
  await prisma.$transaction(examples.map((example, index) => {
    const id = `campus-hub-upcoming-demo-${index + 1}`;
    const date = new Date(Date.now() + (index + 1) * 86400_000).toISOString().slice(0, 10);
    return prisma.event.upsert({
      where: { id },
      create: {
        id, ...example, organizerId: organizer.id, date, startTime: "16:00", endTime: "17:30",
        summary: example.description, status: "APPROVED",
      },
      update: { date, posterUrl: example.posterUrl },
    });
  }));
  console.log("Added three upcoming events to the local demo catalogue.");
} finally {
  await prisma.$disconnect();
}
