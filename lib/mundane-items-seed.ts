export type MundaneItemSeed = {
  name: string;
  slot: string;
  description: string;
  class_name: string;
};

export const STARTER_MUNDANE_ITEMS: MundaneItemSeed[] = [
  // ── Barbarian ──────────────────────────────────────────────────────────────
  { class_name: 'barbarian', slot: 'weapon',  name: 'Greataxe',          description: 'A heavy two-handed axe, its blade notched from countless battles.' },
  { class_name: 'barbarian', slot: 'offhand', name: 'Tribal Totem',      description: 'A carved bone fetish worn on the off-hand, said to ward off evil spirits.' },
  { class_name: 'barbarian', slot: 'head',    name: 'Iron Warhelm',      description: 'A battered iron helmet adorned with crude engravings of past victories.' },
  { class_name: 'barbarian', slot: 'chest',   name: 'Stitched Furs',     description: 'Heavy animal pelts roughly sewn together, offering warmth and modest protection.' },
  { class_name: 'barbarian', slot: 'hands',   name: 'Spiked Gauntlets',  description: 'Fingerless leather gloves reinforced with iron studs.' },
  { class_name: 'barbarian', slot: 'feet',    name: 'Fur-Lined Boots',   description: 'Heavy boots wrapped in cured animal hide, perfect for harsh terrain.' },
  { class_name: 'barbarian', slot: 'waist',   name: 'Trophy Belt',       description: 'A wide leather belt adorned with trophies from defeated foes.' },
  { class_name: 'barbarian', slot: 'neck',    name: 'Bone Necklace',     description: 'A string of carved animal bones worn as a trophy of strength.' },
  { class_name: 'barbarian', slot: 'ring',    name: 'Clan Iron Ring',    description: 'A simple band of hammered iron, worn as a mark of clan allegiance.' },
  { class_name: 'barbarian', slot: 'wrist',   name: 'Hide Bracers',      description: 'Wide strips of hardened leather wrapped around the forearms.' },
  { class_name: 'barbarian', slot: 'back',    name: 'Fur Cloak',         description: 'A thick fur cloak, both practical protection and a display of the hunt.' },

  // ── Bard ───────────────────────────────────────────────────────────────────
  { class_name: 'bard', slot: 'weapon',  name: 'Rapier',              description: 'A slender, elegant blade favoured by duelists and performers alike.' },
  { class_name: 'bard', slot: 'offhand', name: 'Lute',                description: 'A well-crafted wooden lute, its strings tuned for battle-chants and tavern ballads.' },
  { class_name: 'bard', slot: 'head',    name: 'Feathered Cap',       description: 'A wide-brimmed felt cap adorned with a colourful feather.' },
  { class_name: 'bard', slot: 'chest',   name: "Performer's Coat",    description: 'A vibrant doublet with embroidered trim, cut to allow free movement on stage or battlefield.' },
  { class_name: 'bard', slot: 'hands',   name: 'Silk Gloves',         description: 'Thin silk gloves that allow dexterous fingerwork while playing or picking pockets.' },
  { class_name: 'bard', slot: 'feet',    name: 'Soft Leather Boots',  description: 'Well-made boots that make little sound on wooden floors or cobblestones.' },
  { class_name: 'bard', slot: 'waist',   name: 'Silk Sash',           description: 'A long sash of coloured silk, tied at the waist with theatrical flair.' },
  { class_name: 'bard', slot: 'neck',    name: 'Silver Chain',        description: 'A fine silver chain worn as both adornment and a subtle mark of success.' },
  { class_name: 'bard', slot: 'ring',    name: 'Performer Signet',    description: 'A silver ring bearing a personal seal, used to authenticate correspondence and impress patrons.' },
  { class_name: 'bard', slot: 'wrist',   name: 'Gilded Bracelet',     description: 'A thin gold-coloured bracelet that catches the light during performances.' },
  { class_name: 'bard', slot: 'back',    name: 'Travelling Cloak',    description: 'A well-made cloak in a deep, rich colour, suitable for the road or the stage.' },

  // ── Cleric ─────────────────────────────────────────────────────────────────
  { class_name: 'cleric', slot: 'weapon',  name: 'Holy Mace',         description: 'A sturdy mace bearing the symbol of a deity, used both as a weapon and a divine focus.' },
  { class_name: 'cleric', slot: 'offhand', name: 'Wooden Shield',     description: 'A simple wooden shield painted with a holy symbol.' },
  { class_name: 'cleric', slot: 'head',    name: 'Prayer Cowl',       description: 'A soft linen cowl worn during prayer and meditation.' },
  { class_name: 'cleric', slot: 'chest',   name: 'Clerical Robes',    description: 'Plain but well-made religious robes in the colours of a deity.' },
  { class_name: 'cleric', slot: 'hands',   name: 'Blessed Bracers',   description: 'Simple cloth bracers marked with holy symbols.' },
  { class_name: 'cleric', slot: 'feet',    name: 'Temple Sandals',    description: 'Sandals worn during religious ceremonies, symbolising humility before the divine.' },
  { class_name: 'cleric', slot: 'waist',   name: 'Holy Girdle',       description: 'A leather belt engraved with prayers and divine symbols.' },
  { class_name: 'cleric', slot: 'neck',    name: 'Prayer Beads',      description: 'A string of polished wooden beads used for prayer and counting blessings.' },
  { class_name: 'cleric', slot: 'ring',    name: 'Deity Signet',      description: 'A ring bearing the symbol of a deity, marking the wearer as a servant of the faith.' },
  { class_name: 'cleric', slot: 'wrist',   name: 'Holy Bracelet',     description: 'A simple bracelet inscribed with a prayer for protection.' },
  { class_name: 'cleric', slot: 'back',    name: "Pilgrim's Cloak",   description: 'A plain, hard-wearing cloak worn on long journeys to holy sites.' },

  // ── Druid ──────────────────────────────────────────────────────────────────
  { class_name: 'druid', slot: 'weapon',  name: 'Gnarled Staff',      description: 'A staff cut from a sacred grove, used both for walking and channelling natural power.' },
  { class_name: 'druid', slot: 'offhand', name: 'Wicker Totem',       description: 'A small woven figure representing a nature spirit, carried into battle for blessing.' },
  { class_name: 'druid', slot: 'head',    name: 'Leaf Wreath',        description: 'A circlet woven from living leaves that never seem to wither.' },
  { class_name: 'druid', slot: 'chest',   name: 'Hide Armour',        description: 'Armour made from the cured hide of a beast that gave its life willingly.' },
  { class_name: 'druid', slot: 'hands',   name: 'Bark Bracers',       description: 'Bracers fashioned from thick, smooth bark reinforced with leather.' },
  { class_name: 'druid', slot: 'feet',    name: 'Root Sandals',       description: 'Sandals woven from tough plant fibres, allowing the wearer to feel the earth.' },
  { class_name: 'druid', slot: 'waist',   name: 'Vine Cord',          description: 'A belt of braided vines and leather, practical yet deeply connected to nature.' },
  { class_name: 'druid', slot: 'neck',    name: 'Wooden Totem',       description: 'A carved wooden pendant depicting a woodland creature, a mark of the druid\'s bond with nature.' },
  { class_name: 'druid', slot: 'ring',    name: 'Oak Ring',           description: 'A simple band carved from a single piece of ancient oak.' },
  { class_name: 'druid', slot: 'wrist',   name: 'Nature Bracelet',    description: 'A bracelet of woven grasses and small stones collected from sacred places.' },
  { class_name: 'druid', slot: 'back',    name: 'Leaf Cloak',         description: 'A cloak fashioned from large, overlapping leaves treated to resist rain and cold.' },

  // ── Fighter ────────────────────────────────────────────────────────────────
  { class_name: 'fighter', slot: 'weapon',  name: 'Longsword',        description: 'A well-balanced blade, standard issue for soldiers and mercenaries across the realm.' },
  { class_name: 'fighter', slot: 'offhand', name: 'Iron Shield',      description: 'A heavy iron shield, dented from hard use but still dependable.' },
  { class_name: 'fighter', slot: 'head',    name: 'Iron Helm',        description: 'A functional iron helmet offering solid protection without sacrificing vision.' },
  { class_name: 'fighter', slot: 'chest',   name: 'Chainmail',        description: 'Interlocking rings of iron forming a practical suit of armour.' },
  { class_name: 'fighter', slot: 'hands',   name: 'Iron Gauntlets',   description: 'Heavy iron gauntlets that protect the hands during melee combat.' },
  { class_name: 'fighter', slot: 'feet',    name: 'Iron-Shod Boots',  description: 'Heavy leather boots with iron reinforcement on the toes and heels.' },
  { class_name: 'fighter', slot: 'waist',   name: "Soldier's Belt",   description: 'A wide leather belt with loops and pouches for a fighter\'s essentials.' },
  { class_name: 'fighter', slot: 'neck',    name: 'Iron Gorget',      description: 'A protective collar of iron that guards the throat in close combat.' },
  { class_name: 'fighter', slot: 'ring',    name: 'Training Ring',    description: 'A plain iron ring, given to soldiers upon completing their training.' },
  { class_name: 'fighter', slot: 'wrist',   name: 'Iron Vambrace',    description: 'A solid iron bracer that protects the forearm from glancing blows.' },
  { class_name: 'fighter', slot: 'back',    name: 'Battle Cloak',     description: 'A heavy wool cloak in military colours, durable enough for hard campaigning.' },

  // ── Monk ───────────────────────────────────────────────────────────────────
  { class_name: 'monk', slot: 'weapon',  name: 'Fighting Staff',      description: 'A smooth wooden staff, balanced for both offence and defence in open-hand fighting.' },
  { class_name: 'monk', slot: 'offhand', name: 'Hand Wraps',          description: 'Strips of cloth wrapped tightly around the fists for unarmed combat.' },
  { class_name: 'monk', slot: 'head',    name: 'Brow Cloth',          description: 'A simple strip of cloth tied across the brow to keep sweat from the eyes during training.' },
  { class_name: 'monk', slot: 'chest',   name: "Monk's Gi",           description: 'A plain white gi, worn during training and battle alike, clean despite heavy use.' },
  { class_name: 'monk', slot: 'hands',   name: 'Sparring Gloves',     description: 'Lightly padded fingerless gloves for practice sparring.' },
  { class_name: 'monk', slot: 'feet',    name: 'Tabi Sandals',        description: 'Split-toe sandals worn during training, offering both grip and flexibility.' },
  { class_name: 'monk', slot: 'waist',   name: 'Hemp Cord Belt',      description: 'A simple cord of braided hemp that marks the monk\'s rank in their order.' },
  { class_name: 'monk', slot: 'neck',    name: 'Meditation Beads',    description: 'Smooth stone beads strung on a cord, used to count breathing cycles during meditation.' },
  { class_name: 'monk', slot: 'ring',    name: 'Jade Ring',           description: 'A ring carved from a single piece of jade, given to monks who complete their foundational training.' },
  { class_name: 'monk', slot: 'wrist',   name: 'Sparring Bracers',    description: 'Thin wooden bracers lashed to the forearms to protect against weapon deflections.' },
  { class_name: 'monk', slot: 'back',    name: 'Meditation Cloth',    description: 'A simple cloth worn draped over the shoulders during meditation, removed before combat.' },

  // ── Paladin ────────────────────────────────────────────────────────────────
  { class_name: 'paladin', slot: 'weapon',  name: 'Blessed Longsword', description: 'A longsword with a prayer etched into the blade, carried as both weapon and holy symbol.' },
  { class_name: 'paladin', slot: 'offhand', name: 'Tower Shield',      description: 'A large rectangular shield bearing a painted holy symbol.' },
  { class_name: 'paladin', slot: 'head',    name: 'Great Helm',        description: 'A full-faced helm engraved with religious iconography, offering impressive protection.' },
  { class_name: 'paladin', slot: 'chest',   name: 'Plate Armour',      description: 'Heavy plate armour polished to a shine, worn as much for the impression it makes as the protection.' },
  { class_name: 'paladin', slot: 'hands',   name: 'Blessed Gauntlets', description: 'Heavy gauntlets inscribed with holy prayers along the knuckles.' },
  { class_name: 'paladin', slot: 'feet',    name: "Knight's Sabatons", description: 'Articulated metal footwear that clinks impressively with each step.' },
  { class_name: 'paladin', slot: 'waist',   name: "Paladin's Sash",    description: 'A white sash bearing a holy symbol, worn over armour as a mark of faith.' },
  { class_name: 'paladin', slot: 'neck',    name: 'Holy Amulet',       description: 'A heavy pendant bearing the symbol of a deity, worn over armour.' },
  { class_name: 'paladin', slot: 'ring',    name: 'Order Signet',      description: 'A heavy signet ring bearing the seal of a holy order.' },
  { class_name: 'paladin', slot: 'wrist',   name: 'Blessed Vambraces', description: 'Forearm guards inscribed with protective prayers.' },
  { class_name: 'paladin', slot: 'back',    name: 'Holy Cloak',        description: 'A clean white cloak bearing a large holy symbol on the back.' },

  // ── Ranger ─────────────────────────────────────────────────────────────────
  { class_name: 'ranger', slot: 'weapon',  name: 'Longbow',            description: 'A tall, graceful bow carved from flexible yew, favoured by hunters and scouts.' },
  { class_name: 'ranger', slot: 'offhand', name: 'Short Sword',        description: 'A compact blade for close quarters when the bow is no longer practical.' },
  { class_name: 'ranger', slot: 'head',    name: "Scout's Hood",       description: 'A close-fitting hood in muted earthy colours, ideal for moving unseen through the wilderness.' },
  { class_name: 'ranger', slot: 'chest',   name: 'Studded Leather',    description: 'Leather armour reinforced with iron studs, offering solid protection without slowing movement.' },
  { class_name: 'ranger', slot: 'hands',   name: "Archer's Gloves",    description: 'Fingerless gloves with a reinforced thumb for drawing a bowstring.' },
  { class_name: 'ranger', slot: 'feet',    name: "Ranger's Boots",     description: 'Soft-soled boots that muffle footsteps on forest floors.' },
  { class_name: 'ranger', slot: 'waist',   name: "Hunter's Belt",      description: 'A wide belt with pouches for arrows, tools, and provisions for long journeys.' },
  { class_name: 'ranger', slot: 'neck',    name: 'Carved Totem',       description: 'A small carving of a favoured animal, worn as a good luck charm on hunts.' },
  { class_name: 'ranger', slot: 'ring',    name: "Ranger's Ring",      description: 'A simple ring carved with the tracks of a woodland creature.' },
  { class_name: 'ranger', slot: 'wrist',   name: "Archer's Bracer",    description: 'A leather bracer worn on the bow arm to protect against the bowstring\'s snap.' },
  { class_name: 'ranger', slot: 'back',    name: "Ranger's Cloak",     description: 'A dull green-brown cloak that blends with woodland surroundings.' },

  // ── Rogue ──────────────────────────────────────────────────────────────────
  { class_name: 'rogue', slot: 'weapon',  name: 'Dagger',              description: 'A thin blade, balanced for throwing or close-quarters stabbing.' },
  { class_name: 'rogue', slot: 'offhand', name: 'Parrying Dagger',     description: 'A narrow blade used to deflect attacks rather than strike.' },
  { class_name: 'rogue', slot: 'head',    name: 'Shadow Hood',         description: 'A form-fitting hood that obscures the face and muffles sound.' },
  { class_name: 'rogue', slot: 'chest',   name: 'Shadow Leathers',     description: 'Supple black leather armour treated to absorb light and reduce noise.' },
  { class_name: 'rogue', slot: 'hands',   name: 'Lockpick Gloves',     description: 'Thin leather gloves with cut fingertips for dexterous work.' },
  { class_name: 'rogue', slot: 'feet',    name: 'Silent Boots',        description: 'Boots soled with thick felt, making footsteps nearly inaudible.' },
  { class_name: 'rogue', slot: 'waist',   name: "Thief's Belt",        description: 'A belt with numerous hidden pockets and loops for tools of the trade.' },
  { class_name: 'rogue', slot: 'neck',    name: 'Leather Cord',        description: 'A plain leather cord, practical and easy to remove quickly if grabbed.' },
  { class_name: 'rogue', slot: 'ring',    name: 'Guild Ring',          description: 'A dark iron ring worn as a mark of thieves\' guild membership.' },
  { class_name: 'rogue', slot: 'wrist',   name: 'Hidden Bracer',       description: 'A leather bracer with a concealed compartment for small items.' },
  { class_name: 'rogue', slot: 'back',    name: 'Shadow Cloak',        description: 'A dark cloak that blends into shadows, standard equipment for any self-respecting rogue.' },

  // ── Sorcerer ───────────────────────────────────────────────────────────────
  { class_name: 'sorcerer', slot: 'weapon',  name: 'Arcane Focus Rod',   description: 'A slim rod of polished obsidian used to channel innate magical power.' },
  { class_name: 'sorcerer', slot: 'offhand', name: 'Crystal Orb',        description: 'A smooth sphere of smoky crystal that resonates with raw magical energy.' },
  { class_name: 'sorcerer', slot: 'head',    name: 'Arcane Circlet',     description: 'A thin band of silver set with a small gemstone that seems to glow faintly.' },
  { class_name: 'sorcerer', slot: 'chest',   name: 'Spellweave Robes',   description: 'Flowing robes threaded with silver, designed to channel the wearer\'s innate power.' },
  { class_name: 'sorcerer', slot: 'hands',   name: 'Caster\'s Silk Gloves', description: 'Fine silk gloves that allow precise gesturing during spellcasting.' },
  { class_name: 'sorcerer', slot: 'feet',    name: 'Spellweave Slippers', description: 'Soft slippers that provide no resistance to movement or spellcasting.' },
  { class_name: 'sorcerer', slot: 'waist',   name: 'Silver Sash',        description: 'A sash of silver thread worn at the waist, marking the sorcerer\'s unusual origin.' },
  { class_name: 'sorcerer', slot: 'neck',    name: 'Bloodstone Pendant', description: 'A deep red gemstone pendant said to resonate with bloodline magic.' },
  { class_name: 'sorcerer', slot: 'ring',    name: 'Sorcerer\'s Ring',   description: 'A silver ring set with a fragment of enchanted crystal, a focus for raw power.' },
  { class_name: 'sorcerer', slot: 'wrist',   name: 'Spellbinding Bracelet', description: 'A delicate silver bracelet inscribed with runes of power.' },
  { class_name: 'sorcerer', slot: 'back',    name: 'Shifting Cloak',     description: 'A cloak that seems to shift slightly even in the absence of wind.' },

  // ── Warlock ────────────────────────────────────────────────────────────────
  { class_name: 'warlock', slot: 'weapon',  name: 'Pact Blade',          description: 'A dark blade formed from an eldritch pact, its edge unnaturally sharp.' },
  { class_name: 'warlock', slot: 'offhand', name: 'Eldritch Tome',       description: 'A heavy book bound in strange leather, filled with incomprehensible script.' },
  { class_name: 'warlock', slot: 'head',    name: 'Shadow Cowl',         description: 'A deep hood that casts the face in permanent shadow.' },
  { class_name: 'warlock', slot: 'chest',   name: 'Dark Robes',          description: 'Heavy robes in deep purple and black, suitable for one who has made dark bargains.' },
  { class_name: 'warlock', slot: 'hands',   name: "Warlock's Bracers",   description: 'Black leather bracers etched with the sigil of a patron.' },
  { class_name: 'warlock', slot: 'feet',    name: 'Dark Boots',          description: 'Heavy boots that make little sound despite their solid construction.' },
  { class_name: 'warlock', slot: 'waist',   name: 'Pact Cord',           description: 'A cord of dark material tied at the waist, bearing a small symbol of the patron.' },
  { class_name: 'warlock', slot: 'neck',    name: 'Pact Medallion',      description: 'A heavy medallion bearing the symbol of the warlock\'s patron.' },
  { class_name: 'warlock', slot: 'ring',    name: 'Patron Ring',         description: 'A black iron ring that seems to absorb light.' },
  { class_name: 'warlock', slot: 'wrist',   name: 'Eldritch Bracer',     description: 'A bracer inscribed with a binding contract in a language few can read.' },
  { class_name: 'warlock', slot: 'back',    name: 'Void Cloak',          description: 'A cloak of deep, dark fabric that seems slightly too dark, as if absorbing light.' },

  // ── Wizard ─────────────────────────────────────────────────────────────────
  { class_name: 'wizard', slot: 'weapon',  name: "Wizard's Staff",       description: 'A tall staff topped with a crystal that stores a small reserve of magical energy.' },
  { class_name: 'wizard', slot: 'offhand', name: 'Spellbook',            description: 'The wizard\'s most prized possession, containing years of painstakingly copied spells.' },
  { class_name: 'wizard', slot: 'head',    name: 'Pointy Hat',           description: 'A tall conical hat, impractical in low doorways but unmistakably the sign of a wizard.' },
  { class_name: 'wizard', slot: 'chest',   name: "Scholar's Robes",      description: 'Finely made robes in deep blue or grey, pockets in every seam for components and notes.' },
  { class_name: 'wizard', slot: 'hands',   name: 'Component Gloves',     description: 'Thin gloves with the fingertips removed for precise material component handling.' },
  { class_name: 'wizard', slot: 'feet',    name: "Scholar's Shoes",      description: 'Comfortable leather shoes, worn thin from years of pacing through libraries.' },
  { class_name: 'wizard', slot: 'waist',   name: 'Component Belt',       description: 'A belt of many small pouches for carrying spell components.' },
  { class_name: 'wizard', slot: 'neck',    name: 'Focus Crystal',        description: 'A small crystal pendant on a chain, used to focus arcane energy.' },
  { class_name: 'wizard', slot: 'ring',    name: "Wizard's Ring",        description: 'A ring set with a chip of enchanted stone, inscribed with a first-level cantrip.' },
  { class_name: 'wizard', slot: 'wrist',   name: 'Arcane Bracer',        description: 'A bracer inscribed with complex magical formulae.' },
  { class_name: 'wizard', slot: 'back',    name: "Scholar's Cloak",      description: 'A plain but high-quality cloak, often stained with ink and alchemical reagents.' },
];
