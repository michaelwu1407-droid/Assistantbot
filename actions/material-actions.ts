"use server";

import { db } from "@/lib/db";
import { fuzzySearch, SearchableItem } from "@/lib/search";
import { Material } from "@prisma/client";

export interface MaterialView {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  price: number;
  category: string | null;
}

interface MaterialSearchItem extends SearchableItem {
  material: Material
}

/**
 * Search materials for the estimator.
 * Uses fuzzy search on name and description.
 */
export async function searchMaterials(
  workspaceId: string,
  query: string
): Promise<MaterialView[]> {
  const materials = await db.material.findMany({
    where: { workspaceId },
  });

  if (!query) {
    return materials.map(m => ({
      id: m.id,
      name: m.name,
      description: m.description,
      unit: m.unit,
      price: Number(m.price),
      category: m.category
    }));
  }

  const searchable: MaterialSearchItem[] = materials.map(m => ({
    id: m.id,
    searchableFields: [m.name, m.description || "", m.category || ""],
    material: m
  }));

  const results = fuzzySearch<MaterialSearchItem>(searchable, query);

  return results.map(r => ({
    id: r.item.material.id,
    name: r.item.material.name,
    description: r.item.material.description,
    unit: r.item.material.unit,
    price: Number(r.item.material.price),
    category: r.item.material.category
  }));
}

/**
 * Create a new material.
 */
export async function createMaterial(data: {
  name: string;
  description?: string;
  unit: string;
  price: number;
  category?: string;
  workspaceId: string;
}) {
  const material = await db.material.create({
    data: {
      name: data.name,
      description: data.description,
      unit: data.unit,
      price: data.price,
      category: data.category,
      workspaceId: data.workspaceId
    }
  });
  return { success: true, materialId: material.id };
}
