/**
 * Seed de contenu de demonstration pour le portail etudiant.
 * ----------------------------------------------------------------
 * Insere des donnees 100% FICTIVES (annonces, emplois du temps, prets
 * de bibliotheque, bons plans) pour faire vivre l'app etudiante en demo.
 *
 * CONTRAINTE PRIVEE: aucune donnee reelle, aucun appel reseau externe.
 * Tout est ecrit dans PostgreSQL auto-heberge. Les `url` de bons plans
 * sont des liens d'exemple informatifs (https://exemple.fr) - l'etudiant
 * les ouvre dans son navigateur, aucune donnee n'est transmise.
 *
 * Idempotent: pour une universite donnee, si des Announcement existent
 * deja, on saute entierement son seeding.
 *
 * Usage:
 *   node scripts/seed-demo-content.mjs            # toutes les univ actives
 *   node scripts/seed-demo-content.mjs all        # idem
 *   node scripts/seed-demo-content.mjs ecole.test # univ dont domain = ecole.test
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

/** Decalage en jours (et heures) par rapport a maintenant. */
function at(days, hours = 9) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return new Date(d.getTime() + days * DAY + hours * HOUR);
}

const COURSES = [
  { title: 'Mathematiques', location: 'B204', teacher: 'M. Durand' },
  { title: 'Anglais', location: 'A101', teacher: 'Mme Leroy' },
  { title: 'Informatique', location: 'C310', teacher: 'M. Petit' },
  { title: 'Histoire', location: 'B112', teacher: 'Mme Moreau' },
  { title: 'Physique', location: 'D045', teacher: 'M. Bernard' },
  { title: 'Economie', location: 'A220', teacher: 'Mme Dubois' },
  { title: 'Droit', location: 'C108', teacher: 'M. Lambert' },
  { title: 'Philosophie', location: 'B007', teacher: 'Mme Girard' },
];

const BOOKS = [
  { bookTitle: 'Le Petit Prince', bookAuthor: 'Antoine de Saint-Exupery', isbn: '9782070612758' },
  { bookTitle: 'Les Miserables', bookAuthor: 'Victor Hugo', isbn: '9782253096337' },
  { bookTitle: "L'Etranger", bookAuthor: 'Albert Camus', isbn: '9782070360024' },
  { bookTitle: 'Madame Bovary', bookAuthor: 'Gustave Flaubert', isbn: '9782070413119' },
];

const DEALS_LOCAL = [
  { title: '-20% au Resto U', description: 'Reduction sur le menu etudiant.', partner: 'Resto U', category: 'Restauration', code: 'RESTO20', url: 'https://exemple.fr/resto-u' },
  { title: 'Place de cinema a 5 EUR', description: 'Tarif etudiant tous les jours.', partner: 'Cinema Pathe', category: 'Culture', code: 'CINE5', url: 'https://exemple.fr/cinema' },
  { title: 'Abonnement velo offert 1 mois', description: 'Premier mois gratuit.', partner: 'Velib', category: 'Transport', code: 'VELO1MOIS', url: 'https://exemple.fr/velo' },
];

const DEALS_GLOBAL = [
  { title: 'Salle de sport -30%', description: 'Offre nationale etudiante.', partner: 'FitClub', category: 'Sport', code: 'SPORT30', url: 'https://exemple.fr/sport' },
  { title: 'Librairie -15%', description: 'Sur les manuels scolaires.', partner: 'Librairie Centrale', category: 'Culture', code: 'LIVRE15', url: 'https://exemple.fr/librairie' },
];

async function seedUniversity(univ) {
  const existing = await prisma.announcement.count({ where: { universityId: univ.id } });
  if (existing > 0) {
    console.log(`[seed-demo] ${univ.domain}: deja seede (${existing} annonces) - saute.`);
    return { skipped: true };
  }

  const students = await prisma.student.findMany({
    where: { universityId: univ.id, isActive: true },
    select: { id: true, program: true },
  });

  // --- Annonces (4 variees, 1 epinglee, 1 avec expiration future) ---
  await prisma.announcement.createMany({
    data: [
      {
        universityId: univ.id,
        title: 'Bienvenue sur votre espace etudiant',
        body: "Retrouvez ici vos actualites, votre emploi du temps et vos bons plans.",
        category: 'Vie de campus',
        isPinned: true,
        publishedAt: at(-3),
      },
      {
        universityId: univ.id,
        title: 'Planning des examens du semestre',
        body: 'Les convocations seront disponibles prochainement dans votre espace.',
        category: 'Examens',
        isPinned: false,
        publishedAt: at(-2),
      },
      {
        universityId: univ.id,
        title: 'Nouveaux horaires de la bibliotheque',
        body: 'La bibliotheque est desormais ouverte jusqu a 22h en semaine.',
        category: 'Bibliotheque',
        isPinned: false,
        publishedAt: at(-1),
        expiresAt: at(30),
      },
      {
        universityId: univ.id,
        title: 'Alerte meteo: campus ferme demain',
        body: 'Par mesure de precaution, les cours de demain sont reportes.',
        category: 'Urgent',
        isPinned: false,
        publishedAt: at(0, 8),
        expiresAt: at(2),
      },
    ],
  });

  // --- Emploi du temps ---
  const scheduleData = [];
  // Cours a l'echelle de l'universite (studentId null) sur 7 jours.
  for (let i = 0; i < 8; i++) {
    const c = COURSES[i % COURSES.length];
    const start = at(i % 7, 8 + (i % 3) * 2);
    scheduleData.push({
      universityId: univ.id,
      studentId: null,
      program: null,
      title: c.title,
      location: c.location,
      teacher: c.teacher,
      startsAt: start,
      endsAt: new Date(start.getTime() + 2 * HOUR),
    });
  }
  // 2-3 entrees propres a chaque etudiant.
  for (const s of students) {
    const n = 2 + (students.indexOf(s) % 2); // 2 ou 3
    for (let j = 0; j < n; j++) {
      const c = COURSES[(j + 2) % COURSES.length];
      const start = at(j + 1, 14 + j);
      scheduleData.push({
        universityId: univ.id,
        studentId: s.id,
        program: s.program ?? null,
        title: `${c.title} (TD)`,
        location: c.location,
        teacher: c.teacher,
        startsAt: start,
        endsAt: new Date(start.getTime() + 1.5 * HOUR),
      });
    }
  }
  if (scheduleData.length > 0) {
    await prisma.scheduleEntry.createMany({ data: scheduleData });
  }

  // --- Prets de bibliotheque ---
  // Pour LIBRARY: 2 par etudiant. Sinon 1-2 pour la demo (ici 2 aussi
  // mais uniquement pour quelques etudiants si le secteur n'est pas LIBRARY).
  const isLibrary = univ.sector === 'LIBRARY';
  const loanTargets = isLibrary ? students : students.slice(0, Math.min(2, students.length));
  const loanData = [];
  for (const s of loanTargets) {
    const b0 = BOOKS[students.indexOf(s) % BOOKS.length];
    const b1 = BOOKS[(students.indexOf(s) + 1) % BOOKS.length];
    // Un pret proche/en retard d'echeance.
    loanData.push({
      universityId: univ.id,
      studentId: s.id,
      bookTitle: b0.bookTitle,
      bookAuthor: b0.bookAuthor,
      isbn: b0.isbn,
      borrowedAt: at(-20),
      dueAt: at(-2), // en retard
      renewedCount: 0,
      maxRenewals: 2,
    });
    // Un pret avec echeance plus lointaine.
    loanData.push({
      universityId: univ.id,
      studentId: s.id,
      bookTitle: b1.bookTitle,
      bookAuthor: b1.bookAuthor,
      isbn: b1.isbn,
      borrowedAt: at(-5),
      dueAt: at(16),
      renewedCount: 1,
      maxRenewals: 2,
    });
  }
  if (loanData.length > 0) {
    await prisma.libraryLoan.createMany({ data: loanData });
  }

  // --- Bons plans locaux (5 au total: 3 locaux + on s'appuie sur les globaux) ---
  await prisma.deal.createMany({
    data: DEALS_LOCAL.map((d) => ({
      universityId: univ.id,
      title: d.title,
      description: d.description,
      partner: d.partner,
      category: d.category,
      url: d.url,
      code: d.code,
      isActive: true,
      startsAt: at(-10),
      expiresAt: at(60),
    })),
  });

  console.log(
    `[seed-demo] ${univ.domain}: 4 annonces, ${scheduleData.length} cours, ` +
      `${loanData.length} prets, ${DEALS_LOCAL.length} bons plans locaux ` +
      `(${students.length} etudiants).`,
  );
  return { skipped: false, students: students.length };
}

/** Cree les bons plans globaux (universityId null) une seule fois au total. */
async function seedGlobalDeals() {
  const existing = await prisma.deal.count({ where: { universityId: null } });
  if (existing > 0) {
    console.log(`[seed-demo] Bons plans globaux: deja presents (${existing}) - saute.`);
    return;
  }
  await prisma.deal.createMany({
    data: DEALS_GLOBAL.map((d) => ({
      universityId: null,
      title: d.title,
      description: d.description,
      partner: d.partner,
      category: d.category,
      url: d.url,
      code: d.code,
      isActive: true,
      startsAt: at(-15),
      expiresAt: at(90),
    })),
  });
  console.log(`[seed-demo] ${DEALS_GLOBAL.length} bons plans globaux crees.`);
}

async function main() {
  const target = process.argv[2] || 'all';

  const where = { isActive: true };
  if (target !== 'all') {
    where.domain = target;
  }

  const universities = await prisma.university.findMany({ where });
  if (universities.length === 0) {
    console.log(`[seed-demo] Aucune universite active${target !== 'all' ? ` pour domain=${target}` : ''}.`);
    return;
  }

  await seedGlobalDeals();

  let seeded = 0;
  let skipped = 0;
  for (const univ of universities) {
    const r = await seedUniversity(univ);
    if (r.skipped) skipped++;
    else seeded++;
  }

  console.log(`[seed-demo] Termine: ${seeded} univ seedees, ${skipped} sautees (sur ${universities.length}).`);
}

main()
  .catch((e) => {
    console.error('[seed-demo] Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
