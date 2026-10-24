import { MenuItem } from '../shared/models';

/**
 * Reproducible dataset generator: the same (count, seed) pair always
 * produces exactly the same items, so every reviewer sees the same data.
 */

interface CategorySpec {
  styles: string[];
  dishes: string[];
  price: [min: number, max: number];
}

const CATEGORIES: Record<string, CategorySpec> = {
  Burgers: {
    styles: ['Classic', 'Smoky BBQ', 'Double', 'Spicy', 'Truffle', 'Bacon', 'Mushroom Swiss'],
    dishes: ['Beef Burger', 'Cheeseburger', 'Smash Burger', 'Chicken Burger', 'Veggie Burger'],
    price: [7, 19],
  },
  Pizza: {
    styles: ['Wood-fired', 'Thin-crust', 'Deep-dish', 'Classic', 'Spicy', 'Truffle'],
    dishes: ['Margherita', 'Pepperoni', 'Quattro Formaggi', 'Diavola', 'Funghi', 'Capricciosa'],
    price: [9, 24],
  },
  Pasta: {
    styles: ['Fresh', 'Baked', 'Creamy', 'Spicy', 'Homemade', 'Garlic'],
    dishes: ['Carbonara', 'Bolognese', 'Pesto Linguine', 'Lasagna', 'Arrabbiata', 'Alfredo'],
    price: [10, 22],
  },
  Salads: {
    styles: ['Garden', 'Grilled Chicken', 'Mediterranean', 'Crispy', 'Superfood', 'Citrus'],
    dishes: ['Caesar Salad', 'Greek Salad', 'Cobb Salad', 'Quinoa Bowl', 'Caprese', 'Kale Salad'],
    price: [6, 16],
  },
  Sushi: {
    styles: ['Spicy', 'Crispy', 'Deluxe', 'Classic', 'Seared', 'Rainbow'],
    dishes: [
      'Salmon Roll',
      'Tuna Nigiri',
      'California Roll',
      'Dragon Roll',
      'Eel Maki',
      'Sashimi Set',
    ],
    price: [8, 32],
  },
  Grills: {
    styles: ['Charcoal', 'Herb-crusted', 'Smoky', 'Peri-peri', 'Garlic Butter', 'Mixed'],
    dishes: [
      'Ribeye Steak',
      'Lamb Chops',
      'Chicken Skewers',
      'Kofta',
      'Beef Brisket',
      'Grilled Salmon',
    ],
    price: [14, 45],
  },
  Sandwiches: {
    styles: ['Toasted', 'Classic', 'Spicy', 'Deli', 'Grilled', 'Loaded'],
    dishes: [
      'Club Sandwich',
      'Philly Cheesesteak',
      'Chicken Wrap',
      'Falafel Wrap',
      'Reuben',
      'BLT',
    ],
    price: [6, 15],
  },
  Soups: {
    styles: ['Hearty', 'Creamy', 'Spicy', 'Homestyle', 'Roasted', 'Classic'],
    dishes: [
      'Tomato Soup',
      'Lentil Soup',
      'Chicken Noodle Soup',
      'Miso Soup',
      'Minestrone',
      'Pumpkin Soup',
    ],
    price: [4, 11],
  },
  Sides: {
    styles: ['Crispy', 'Loaded', 'Garlic', 'Cajun', 'Truffle', 'Sweet Potato'],
    dishes: ['Fries', 'Onion Rings', 'Wedges', 'Coleslaw', 'Mozzarella Sticks', 'Garlic Bread'],
    price: [3, 9],
  },
  Desserts: {
    styles: ['Chocolate', 'Salted Caramel', 'Vanilla', 'Berry', 'Pistachio', 'Lemon'],
    dishes: ['Cheesecake', 'Brownie', 'Tiramisu', 'Ice Cream Sundae', 'Lava Cake', 'Panna Cotta'],
    price: [4, 13],
  },
  Beverages: {
    styles: ['Iced', 'Fresh', 'Sparkling', 'Classic', 'Mint', 'Large'],
    dishes: ['Lemonade', 'Latte', 'Orange Juice', 'Smoothie', 'Milkshake', 'Iced Tea'],
    price: [2, 8],
  },
  Breakfast: {
    styles: ['Classic', 'Full', 'Healthy', 'Fluffy', 'Smoked Salmon', 'Avocado'],
    dishes: [
      'Pancakes',
      'Eggs Benedict',
      'Omelette',
      'Granola Bowl',
      'French Toast',
      'Breakfast Platter',
    ],
    price: [6, 17],
  },
};

const RESTAURANTS: { name: string; branches: string[]; categories: string[] }[] = [
  {
    name: 'Burger Republic',
    branches: ['Downtown', 'Marina', 'Airport', 'University'],
    categories: ['Burgers', 'Sides', 'Beverages', 'Desserts', 'Sandwiches'],
  },
  {
    name: 'Bella Napoli',
    branches: ['Old Town', 'Riverside', 'Harbor'],
    categories: ['Pizza', 'Pasta', 'Salads', 'Desserts', 'Beverages', 'Soups'],
  },
  {
    name: 'Tokyo Table',
    branches: ['Central', 'Bay Area', 'North Point'],
    categories: ['Sushi', 'Soups', 'Salads', 'Desserts', 'Beverages'],
  },
  {
    name: 'Green Bowl',
    branches: ['Downtown', 'Tech Park', 'Westside', 'Mall of the City'],
    categories: ['Salads', 'Soups', 'Breakfast', 'Beverages', 'Sandwiches'],
  },
  {
    name: 'Ember & Smoke',
    branches: ['Uptown', 'Lakeside', 'Old Town'],
    categories: ['Grills', 'Sides', 'Salads', 'Desserts', 'Beverages', 'Soups'],
  },
  {
    name: 'Sunrise Diner',
    branches: ['Main Street', 'Airport', 'Eastgate', 'Station Square', 'Beachfront'],
    categories: ['Breakfast', 'Burgers', 'Sandwiches', 'Sides', 'Desserts', 'Beverages'],
  },
  {
    name: 'Urban Kitchen',
    branches: ['Financial District', 'Midtown', 'Harbor', 'Tech Park'],
    categories: ['Burgers', 'Pizza', 'Pasta', 'Grills', 'Salads', 'Sides', 'Beverages'],
  },
  {
    name: 'Le Petit Café',
    branches: ['Old Town', 'Gallery Quarter'],
    categories: ['Breakfast', 'Sandwiches', 'Desserts', 'Beverages', 'Soups'],
  },
];

/** Small, fast, seedable PRNG (mulberry32). Returns floats in [0, 1). */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fixed reference date so "last updated" values are reproducible too. */
const REFERENCE_DATE = Date.UTC(2026, 9, 1);
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export function generateMenuItems(count = 50_000, seed = 42): MenuItem[] {
  const random = createRandom(seed);
  const pick = <T>(values: readonly T[]): T => values[Math.floor(random() * values.length)];

  // Flatten restaurants into branches with globally unique ids.
  let nextBranchId = 1;
  const branches = RESTAURANTS.flatMap((restaurant, index) =>
    restaurant.branches.map((branchName) => ({
      restaurantId: index + 1,
      restaurantName: restaurant.name,
      branchId: nextBranchId++,
      branchName,
      categories: restaurant.categories,
    })),
  );

  const items: MenuItem[] = new Array(count);
  for (let i = 0; i < count; i++) {
    const branch = pick(branches);
    const category = pick(branch.categories);
    const spec = CATEGORIES[category];
    const [min, max] = spec.price;
    const price = Math.floor(min + random() * (max - min)) + (random() < 0.5 ? 0.49 : 0.99);

    items[i] = {
      id: i + 1,
      name: `${pick(spec.styles)} ${pick(spec.dishes)}`,
      restaurantId: branch.restaurantId,
      restaurantName: branch.restaurantName,
      branchId: branch.branchId,
      branchName: branch.branchName,
      category,
      price,
      available: random() < 0.85,
      lastUpdated: new Date(REFERENCE_DATE - Math.floor(random() * ONE_YEAR_MS)).toISOString(),
    };
  }
  return items;
}
