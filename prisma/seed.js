import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const data = [
    {
      size: "300x250",
      minCPM: 1.2,
      maxCPM: 2.5,
      geo: "NO,UA",
      adType: "BANNER",
      frequencyCap: 2,
      creativePath: "/public/creatives/demo1.png",
      active: true,
    },
    {
      size: "728x90",
      minCPM: 0.8,
      maxCPM: 1.8,
      geo: "NO",
      adType: "BANNER",
      frequencyCap: 3,
      creativePath: "/public/creatives/demo2.png",
      active: true,
    },
    {
      size: "300x250",
      minCPM: 1.0,
      maxCPM: 2.0,
      geo: "UA",
      adType: "BANNER",
      frequencyCap: 1,
      creativePath: "/public/creatives/demo3.png",
      active: true,
    },
    {
      size: "640x360",
      minCPM: 2.2,
      maxCPM: 4.5,
      geo: "NO,SE",
      adType: "VIDEO",
      frequencyCap: 2,
      creativePath: "/public/creatives/demo4.mp4",
      active: true,
    },
    {
      size: "160x600",
      minCPM: 0.6,
      maxCPM: 1.2,
      geo: "US,NO",
      adType: "BANNER",
      frequencyCap: 5,
      creativePath: "/public/creatives/demo5.png",
      active: true,
    },
  ];

  for (const item of data) {
    await prisma.lineItem.create({ data: item });
    console.log(`✅ Created line item: ${item.size} - ${item.geo}`);
  }

  console.log("🎉 5 line items created successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
