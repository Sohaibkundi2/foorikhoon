/*
  Warnings:

  - A unique constraint covering the columns `[hospitalId,bloodGroup]` on the table `Inventory` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Inventory_hospitalId_bloodGroup_key" ON "Inventory"("hospitalId", "bloodGroup");
