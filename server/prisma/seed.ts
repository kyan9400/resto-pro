import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  const resto = await db.restaurant.upsert({
    where: { slug: "demo-deli" },
    update: {},
    create: { name: "Demo Deli", slug: "demo-deli", currency: "USD" }
  });

  const cat = await db.category.upsert({
    where: { id: "seed-burgers" },
    update: {},
    create: { id: "seed-burgers", name: "Burgers", position: 1, restaurantId: resto.id }
  });

  const burger = await db.menuItem.create({
    data: {
      name: "Classic Burger",
      description: "Beef patty, lettuce, tomato, house sauce",
      price: 899,
      restaurantId: resto.id,
      categoryId: cat.id,
      isAvailable: true
    }
  });

  const group = await db.optionGroup.create({
    data: {
      name: "Add-ons",
      minSelect: 0,
      maxSelect: 3,
      required: false,
      restaurantId: resto.id,
      itemId: burger.id
    }
  });

  await db.option.createMany({
    data: [
      { name: "Cheese",       priceDelta: 100, groupId: group.id },
      { name: "Bacon",        priceDelta: 200, groupId: group.id },
      { name: "Onion Rings",  priceDelta: 150, groupId: group.id }
    ]
  });

  console.log("✅ Seeded Demo Deli with one burger and add-ons.");
}

main().finally(() => db.$disconnect());
