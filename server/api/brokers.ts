import prisma from "../models";

export default defineEventHandler(async (event) => {
  try {
    const mt4Daily = await prisma.mt4Daily.findFirst();
    const mt4Users = await prisma.mt4Users.findFirst();
    const mt4Trade = await prisma.mt4Trade.findMany({ take: 1000 });
    return { mt4Daily, mt4Users, mt4Trade };
  } catch (error) {
    console.log(error);
  }
});
