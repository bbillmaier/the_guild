export type ZoneSeed = {
  uid: string;
  name: string;
  biome: string;
  description: string;
};

export const ZONE_SEEDS: ZoneSeed[] = [
  {
    uid: 'zone-seed-0001-0000-0000-000000000001',
    name: 'The Thornwood',
    biome: 'Forest',
    description: 'A vast and ancient forest where gnarled oaks have grown together so thickly that the canopy blocks out the sky entirely, leaving the forest floor in perpetual green twilight. The trees themselves seem to shift when no one is watching — paths that existed yesterday are gone by morning, and new ones appear that lead nowhere good. The locals say the Thornwood remembers every wrong ever committed within its borders, and that it is patient enough to collect on all of them eventually.',
  },
  {
    uid: 'zone-seed-0002-0000-0000-000000000002',
    name: 'The Verdant Maw',
    biome: 'Jungle',
    description: 'A suffocating expanse of colossal trees, strangler vines, and shrieking wildlife where the air is so thick with moisture that leather rots and iron rusts within a fortnight. Every path closes behind you as the jungle reclaims it, and the ruins of at least three forgotten civilisations lie buried somewhere beneath the roots, their treasures and their curses still intact. Things live here that have never been catalogued, and the jungle seems to actively resent the presence of anyone who arrives with the intention of leaving.',
  },
  {
    uid: 'zone-seed-0003-0000-0000-000000000003',
    name: 'The Frosted Expanse',
    biome: 'Tundra',
    description: 'A brutal and featureless frozen wasteland that stretches for hundreds of miles in every direction, where blizzards descend without warning and can last for weeks at a stretch. The wind here carries sounds from impossible distances — and sometimes sounds that have no clear source at all, low and rhythmic, like something very large breathing beneath the permafrost. Settlements are few, heavily fortified, and deeply suspicious of outsiders, having learned the hard way that not everything that knocks on the gate during a storm is what it claims to be.',
  },
  {
    uid: 'zone-seed-0004-0000-0000-000000000004',
    name: 'The Shattered Ice',
    biome: 'Glacier',
    description: 'A slow-moving glacier of continental scale, cracked into a labyrinth of deep blue crevasses and groaning ice towers that calve without warning into the frozen sea below. Its interior is riddled with caverns worn smooth by ancient meltwater, many of them sealed for thousands of years and containing things — creatures, artefacts, bodies — preserved in uncanny condition. The glacier moves perhaps a foot each year, grinding whatever lies beneath it to powder, and whatever it has been grinding toward for the past century is getting close.',
  },
  {
    uid: 'zone-seed-0005-0000-0000-000000000005',
    name: 'The Sunscorch Wastes',
    biome: 'Desert',
    description: 'An endless expanse of scorched rock and drifting dunes where the sun beats down with a ferocity that feels personal, and water is traded more carefully than gold. Beneath the sands lie the tombs of kings who ruled empires that no longer have names, and nomadic raiders who know the deep desert intimately will kill without hesitation to keep those tombs from being found. At night the temperature plunges well below freezing, and the darkness brings out creatures that spend the killing heat of day buried just below the surface.',
  },
  {
    uid: 'zone-seed-0006-0000-0000-000000000006',
    name: 'The Cracked Basin',
    biome: 'Badlands',
    description: 'A fractured landscape of eroded mesas, dry gulches, and wind-carved rock formations in shades of red and orange that glow like coals at sunset. Flash floods can transform a bone-dry passage into a wall of brown water in minutes with no warning, carving new passages overnight and drowning whatever was sheltering in the gulch. Bandits and desperate outcasts have built a complicated society in the hidden hollows and mesa-tops, and navigating their politics is arguably more dangerous than navigating the terrain.',
  },
  {
    uid: 'zone-seed-0007-0000-0000-000000000007',
    name: 'The Pale Flats',
    biome: 'Salt Flats',
    description: 'A blinding white plain of crystallised salt that stretches to every horizon without a single feature to navigate by, shimmering with heat mirages that show things that are not there — or perhaps things that are there, but elsewhere. Nothing lives openly on the flats, and the silence is so complete that the sound of your own heartbeat becomes intrusive. Travellers who have crossed it report losing days they cannot account for, arriving at the far edge with supplies untouched and no memory of the crossing.',
  },
  {
    uid: 'zone-seed-0008-0000-0000-000000000008',
    name: 'The Mirefen',
    biome: 'Swamp',
    description: 'A sprawling bog of black water, twisted cypress, and floating mats of vegetation where the ground is rarely solid and the air smells of decay and something older underneath it. The Mirefen swallows the careless whole — people, horses, entire caravans — and gives nothing back. Witches and exiles claim its deeper reaches as their own, and they are not the strangest things living there; the fen has its own logic, its own seasons, and its own slow appetites that have nothing to do with anything human.',
  },
  {
    uid: 'zone-seed-0009-0000-0000-000000000009',
    name: 'The Drowned Roots',
    biome: 'Mangrove',
    description: 'A vast coastal tangle of salt-drowned mangrove trees whose arching prop-roots form a labyrinth just above the waterline, navigable only by shallow-draft boat or someone who does not mind swimming in water they cannot see the bottom of. Smugglers have operated here for centuries, using the maze of channels to move goods and people that no legitimate harbour would touch. The water between the roots is inhabited by things that are patient and territorial, and the tidal rhythms mean that passages that exist at low water are ten feet underwater by evening.',
  },
  {
    uid: 'zone-seed-0010-0000-0000-000000000010',
    name: 'The Grey Moors',
    biome: 'Moorland',
    description: 'A vast windswept highland of heather, bog-pools, and standing stones that no one has managed to date or explain, shrouded in a mist that rolls in from the sea and rarely lifts before midday. The moors are hauntingly beautiful in the afternoon light and genuinely, quietly terrifying after dark, when the bog-pools glow faintly and the standing stones seem to be in slightly different positions than they were the night before. The people of the moor villages are close-mouthed about what the stones are for, which is itself an answer of a kind.',
  },
  {
    uid: 'zone-seed-0011-0000-0000-000000000011',
    name: 'The Amber Plains',
    biome: 'Plains',
    description: 'Rolling grasslands that stretch from the guild walls to the distant smudge of the mountain range, broken only by the occasional river crossing and the ruins of watchtowers that have not been staffed in living memory. The trade roads cross the plains openly and are well-travelled, which makes them excellent hunting ground for the warbands that control the open ground between the waystation towns. At certain times of year the grass is tall enough to hide a mounted rider, and the plains have their own way of making a large force feel very small and very exposed.',
  },
  {
    uid: 'zone-seed-0012-0000-0000-000000000012',
    name: 'The Burning Grasslands',
    biome: 'Savanna',
    description: 'A vast dry savanna baked gold and ochre under a white sky, where the grass is chest-high and the heat haze makes distances impossible to judge. Great herds of grazing beasts migrate across it in patterns that the predators — animal and otherwise — have learned to read perfectly, and anything that cannot run very fast or fight very hard tends not to last long here. Wildfire is a constant presence during the dry season, moving with the wind faster than a horse can gallop, and the smoke on the horizon is never a good sign.',
  },
  {
    uid: 'zone-seed-0013-0000-0000-000000000013',
    name: 'The Iron Steppe',
    biome: 'Steppe',
    description: 'An immense open grassland scoured by cold winds that carry grit and the smell of distant rain, where mounted warbands have fought, merged, fractured, and fought again for as long as anyone has kept records. There are no natural fortifications here, no chokepoints or defensible positions — speed, endurance, and ferocity are the only currencies that matter on the steppe, and the clans that have mastered all three are very difficult to reason with. A dozen different factions currently claim sovereignty over various portions of it, none of them convincingly.',
  },
  {
    uid: 'zone-seed-0014-0000-0000-000000000014',
    name: 'The Spinepeaks',
    biome: 'Mountain',
    description: 'A jagged mountain range whose highest passes are only navigable for three months of the year, and even then only by those who know exactly which route to take and have the sense not to rush. The peaks are home to creatures that have been there since before the lowland kingdoms had names — stone giants who regard the mountains as their private estate, griffons that nest on ledges no climber could reach, and things in the deeper caves that the giants themselves give a wide berth. The mining settlements on the lower slopes are wealthy, industrious, and possessed of a very specific kind of gallows humour that comes from knowing exactly what lives above them.',
  },
  {
    uid: 'zone-seed-0015-0000-0000-000000000015',
    name: 'The Bleeding Gorge',
    biome: 'Canyon',
    description: 'A deep red-rock canyon system carved over millennia by a river that has long since been diverted or drunk dry, its sheer walls striped with geological strata in every shade of red, orange, and deep purple. The walls muffle sound in strange ways — voices carry around corners where they should not, and loud noises seem to vanish entirely — which makes the gorge excellent for ambushes and very difficult for coordinated parties to navigate safely. At the bottom, in the deepest and most inaccessible sections, the original riverbed is littered with the bones of things that fell in and could not get out.',
  },
  {
    uid: 'zone-seed-0016-0000-0000-000000000016',
    name: 'The Cindermaw',
    biome: 'Volcano',
    description: 'An active volcanic range of fire-cracked obsidian rock, sulphur vents, and rivers of slow-moving lava that glow orange in the perpetual ash-haze that hangs over the range like a second sky. The air tastes of sulphur and mineral heat, the ground is warm underfoot even in the dead of winter, and the occasional deep tremor serves as a reminder that the whole landscape is sitting on top of something that has not decided to behave forever. Creatures that thrive in extreme heat have claimed the lower slopes, and something much larger and older lives in the caldera at the summit that the fire giants will not discuss.',
  },
  {
    uid: 'zone-seed-0017-0000-0000-000000000017',
    name: 'The Ashen Reach',
    biome: 'Ash Wastes',
    description: 'A vast grey desolation left behind by a volcanic catastrophe that buried an entire civilisation under metres of ash several centuries ago, its surface now a cracked and glassy plain of cooled pyroclastic flow. Fine grey ash still drifts on the wind in great slow clouds, coating everything and getting into every gap in armour, and the ruins of the civilisation that once stood here protrude from the waste at strange angles like broken teeth. Nothing grows on the Ashen Reach, but things still move across it — shapes in the ash-drifts that are gone when you look directly at them, and marks in the ground that appear overnight in patterns too regular to be natural.',
  },
  {
    uid: 'zone-seed-0018-0000-0000-000000000018',
    name: 'The Saltwind Shore',
    biome: 'Coastal',
    description: 'A wild and dramatic stretch of sea-cliffs, hidden coves, and wave-lashed headlands where the sea crashes against the rocks with a ferocity that has broken dozens of ships over the centuries, and the wrecks still litter the shallower sections of coast. Pirates and free traders use the secret inlets that only locals know about, and the harbour towns that dot the more sheltered sections of coastline are prosperous, weather-beaten, and deeply pragmatic about what kinds of cargo they ask questions about. The sea here has moods of its own and is known to take people who stand too close to the edge on days when it is feeling acquisitive.',
  },
  {
    uid: 'zone-seed-0019-0000-0000-000000000019',
    name: 'The Sunless Depths',
    biome: 'Deep Ocean',
    description: 'The lightless abyssal trenches of a deep cold sea, where the pressure is sufficient to crush stone and the water temperature hovers just above freezing at every depth. Ancient things live here that predate the surface civilisations by geological ages, dreaming slow thoughts in the absolute dark and occasionally sending portions of themselves upward to investigate disturbances. The few submersible craft that have been built to reach these depths have returned with damaged hulls, traumatised crews, and cargo holds containing artefacts that no one has managed to explain — when they return at all.',
  },
  {
    uid: 'zone-seed-0020-0000-0000-000000000020',
    name: 'The Drifting Peaks',
    biome: 'Sky',
    description: 'A scattered archipelago of floating rock islands suspended miles above the earth by ancient enchantments that were better understood by their creators than by anyone alive today, their undersides trailing long roots and waterfalls that evaporate before reaching the ground. The islands drift slowly on air currents and seasonal winds, meaning their position relative to each other and to the ground below changes constantly — charts of the Drifting Peaks are sold with the explicit caveat that they are already out of date. Getting there requires wings, a very tall and very mobile tower, or access to one of the old anchor-chains that dangle from the larger islands and end several hundred feet above the ground.',
  },
  {
    uid: 'zone-seed-0021-0000-0000-000000000021',
    name: 'The Deep Below',
    biome: 'Underdark',
    description: 'A continent-spanning network of caverns, tunnels, and underground seas far beneath the surface world, where entire civilisations have developed over millennia in complete isolation from sunlight and fresh air. The politics of the Deep Below are ancient, labyrinthine, and vicious even by the standards of the surface world — long memories, old grudges, and the constant pressure of scarce resources have produced cultures that are sophisticated, ruthless, and deeply alien to surface sensibilities. What passes for diplomacy down here is best described as structured murder, and the factions that have survived longest are the ones most comfortable with that framing.',
  },
  {
    uid: 'zone-seed-0022-0000-0000-000000000022',
    name: 'The Wandering Glade',
    biome: 'Feywild',
    description: 'A mirror of the natural world refracted through a prism of impossible beauty and casual, elegant cruelty, where every colour is slightly too saturated and every sound carries emotional weight it has no business carrying. The geography of the Wandering Glade is not fixed — rivers change course to be more interesting, mountains appear overnight because someone thought the view needed improving, and the border between this place and the mortal world shifts with the mood of the fey courts. Time moves differently here and not consistently, so travellers have arrived home to find decades have passed, or have spent what felt like years and returned the same afternoon.',
  },
  {
    uid: 'zone-seed-0023-0000-0000-000000000023',
    name: 'The Shrouded Vale',
    biome: 'Shadowfell',
    description: 'A dim and colourless mirror of the mortal world where all warmth has been leached away and replaced with a pervasive grey melancholy that seeps into the bones of visitors within hours of arrival. The dead linger here far longer than they should, not as mindless shamblers but as their former selves grown cold and bitter, unable to move on and increasingly resentful of those who still live. Grief and despair have genuine physical weight in the Shrouded Vale — experienced travellers carry emotional ballast, things that make them happy, in the same way they carry torches, because hope is the rarest and most necessary resource the Vale has to offer.',
  },
  {
    uid: 'zone-seed-0024-0000-0000-000000000024',
    name: 'The Infinite Silver',
    biome: 'Astral Sea',
    description: 'An endless silver-white void between the planes where the ordinary rules of distance, direction, and time become suggestions rather than laws, and the petrified bodies of dead gods drift like continents through the luminous nothing. Githyanki fleets hunt through the Silver on silver ships crewed by warriors who have never known a home that was not moving, raiding the god-corpse islands for the divine ichor that still wells up from ancient wounds. Distance here is measured in thought rather than miles — experienced travellers move by intent, knowing precisely where they want to be, and the Silver has a way of testing whether that intention is genuine.',
  },
];
