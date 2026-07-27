-- CreateTable
CREATE TABLE "SprintPeriod" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sprintNumber" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SprintPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SprintPeriod_projectId_idx" ON "SprintPeriod"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "SprintPeriod_projectId_sprintNumber_key" ON "SprintPeriod"("projectId", "sprintNumber");

-- AddForeignKey
ALTER TABLE "SprintPeriod" ADD CONSTRAINT "SprintPeriod_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
