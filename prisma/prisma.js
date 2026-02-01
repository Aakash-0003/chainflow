import pkg from "@prisma/client";
const { PrismaClient } = pkg;
const prisma = new PrismaClient();
// console.log("prisma", prisma)

export default prisma