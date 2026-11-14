// Code serveur de l'appli des pisteurs. Il est chargé automatiquement par le petit script « chargeur » collé dans Apps Script.
// Ne contient aucun mot de passe : le code d'équipe et les réglages sont dans la feuille Google.
/**
 * Appli pisteurs – Glacier 3000
 * Site web relié à ce Google Sheets (Google Apps Script).
 *
 * Onglets du tableau :
 *   Stock         : un article par ligne (nom, seuils, photos, total tous lieux)
 *   Quantites     : combien il y a de chaque article dans chaque lieu
 *   Lieux         : les lieux de stockage et la date du dernier comptage
 *   Preparations  : les préparations de piste enregistrées
 *   Mouvements    : l'historique des entrées, sorties et comptages
 *   Commandes     : le matériel à monter d'un local à un autre (demandé à la radio)
 *   Taches        : tâches de l'équipe (quoi, où, priorité, qui l'a prise ou faite)
 *   Zones         : la liste des zones proposées pour les tâches (une par ligne, dans l'ordre)
 *   Demandes      : achats et fabrications (panneaux, matériel à commander…)
 *   Planning      : le calendrier partagé (soirées, ouvertures, formations…)
 *   Formation     : les vidéos YouTube, rangées par rubrique (une ligne sans lien = rubrique vide)
 *   Config        : le code d'équipe et le dossier des photos
 *
 * Première fois (ou après une mise à jour) : choisir « installer » en haut, puis « Exécuter ».
 * Pour ajouter un lieu : ajouter une ligne dans l'onglet Lieux.
 */

var ONGLET_STOCK = 'Stock', ONGLET_QTE = 'Quantites', ONGLET_LIEUX = 'Lieux';
var ONGLET_PREPS = 'Preparations', ONGLET_MOUV = 'Mouvements', ONGLET_CONFIG = 'Config', ONGLET_CMD = 'Commandes';
var COL_CMD = ['id', 'de', 'vers', 'note', 'lignes', 'statut', 'cree_le', 'pris_le', 'livre_le'];
var ONGLET_FORM = 'Formation', COL_FORM = ['id', 'rubrique', 'titre', 'lien', 'description', 'ordre'];
var RUBRIQUES_DEPART = ['RECCO', 'Manip de corde'];
var ONGLET_PLAN = 'Planning', COL_PLAN = ['id', 'date', 'debut', 'fin', 'titre', 'categorie', 'important', 'qui', 'note', 'cree_le'];
var ONGLET_TACHES = 'Taches', COL_TACHES = ['id', 'texte', 'zone', 'priorite', 'etat', 'pris_par', 'fait_par', 'fait_le', 'cree_par', 'cree_le', 'materiel', 'maj_le', 'ordre', 'photos'];
var ONGLET_ZONES = 'Zones', COL_ZONES = ['zone', 'ordre'];
// Secteurs des tâches (modifiables dans l'onglet « Zones » du tableau)
var ZONES_DEPART = ['Glacier', 'Red Run', 'Martisberg', 'Black Wall', 'Autres'];
var PRIOS = ['urgent', 'normal', 'tard', 'attention'];
var ONGLET_DEM = 'Demandes', COL_DEM = ['id', 'titre', 'type', 'quantite', 'demande_par', 'qui', 'note', 'statut', 'photos', 'cree_le', 'maj_le'];
var STATUTS_DEM = ['demande', 'valide', 'en_cours', 'fait'];
var CATS_PLAN = ['soiree', 'piste', 'formation', 'reunion', 'materiel', 'autre'];
var VERS_PISTE = '__piste'; // commande posée sur les pistes : sort du stock
var COL_STOCK = ['id', 'nom', 'categorie', 'quantite', 'rouge_a', 'jaune_a', 'plein', 'photos', 'ordre'];
var COL_QTE = ['article_id', 'lieu', 'quantite'];
var COL_LIEUX = ['lieu', 'dernier_comptage'];
var COL_PREPS = ['id', 'titre', 'lignes', 'pris', 'statut', 'cree_le', 'sortie_le'];
var COL_MOUV = ['date', 'article_id', 'article', 'mouvement', 'ou', 'lieu'];
var CATEGORIES = ['Jalons', 'Banderoles', 'Panneaux', 'Filets', 'Autre'];
var LIEUX_DEPART = ['Cabane', 'Local quad (Scex Rouge)', 'Dôme', 'Audon', 'Tunnel Black Wall', 'Oldenegg'];

// Stock de départ (repris de la page Claude : quantités d'exemple, à corriger)
// [id, nom, catégorie, quantité, rouge à, jaune à, plein] — mis dans le premier lieu (Cabane)
var STOCK_DEPART = [
  ['jalon-bleu', 'Jalon bleu', 'Jalons', 42, 15, 30, 80],
  ['jalon-rouge', 'Jalon rouge', 'Jalons', 24, 15, 30, 80],
  ['jalon-noir', 'Jalon noir', 'Jalons', 9, 10, 20, 50],
  ['jalon-orange', 'Jalon orange (fermeture)', 'Jalons', 35, 10, 20, 50],
  ['band-croisement', 'Banderole Croisement', 'Banderoles', 6, 2, 4, 8],
  ['band-glacier', 'Banderole Glacier', 'Banderoles', 3, 2, 4, 8],
  ['band-cailloux', 'Banderole Cailloux', 'Banderoles', 1, 2, 4, 6],
  ['band-ralentir', 'Banderole Ralentir', 'Banderoles', 5, 2, 3, 8],
  ['pan-ralentir', 'Panneau Ralentir', 'Panneaux', 7, 3, 5, 12],
  ['pan-croisement', 'Panneau Croisement', 'Panneaux', 4, 3, 5, 12],
  ['pan-ferme', 'Panneau Fermé', 'Panneaux', 2, 3, 5, 10],
  ['pan-indication', "Panneau d'indication", 'Panneaux', 14, 4, 8, 20],
  ['filet-orange', 'Filet orange (rouleau)', 'Filets', 0, 2, 3, 8],
  ['filet-protection', 'Filet de protection', 'Filets', 3, 2, 4, 10]
];

/* ------------------------------------------------------------ Le site */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Glacier 3000 Pisteurs')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

/* ------------------------------------------------------------ Accès depuis la page de l'équipe (hors Google) */
// La page hébergée à part appelle ces fonctions par l'adresse /exec : ça marche même avec plusieurs comptes Google connectés.
var API_ = {donnees: donnees, importerDonnees: importerDonnees, photoBase64: photoBase64, mouvement: mouvement, comptage: comptage, enregistrerArticle: enregistrerArticle, supprimerArticle: supprimerArticle, ajouterPhoto: ajouterPhoto, retirerPhoto: retirerPhoto, enregistrerPrep: enregistrerPrep, cocher: cocher, validerPrep: validerPrep, supprimerPrep: supprimerPrep, creerCommande: creerCommande, prendreCommande: prendreCommande, livrerCommande: livrerCommande, supprimerCommande: supprimerCommande, ajouterRubrique: ajouterRubrique, ajouterVideo: ajouterVideo, supprimerVideo: supprimerVideo, enregistrerEvenement: enregistrerEvenement, supprimerEvenement: supprimerEvenement, enregistrerDemande: enregistrerDemande, statutDemande: statutDemande, supprimerDemande: supprimerDemande, ajouterPhotoDemande: ajouterPhotoDemande, retirerPhotoDemande: retirerPhotoDemande, enregistrerPlanning: enregistrerPlanning, enregistrerTache: enregistrerTache, prendreTache: prendreTache, terminerTache: terminerTache, rouvrirTache: rouvrirTache, supprimerTache: supprimerTache, ordonnerTaches: ordonnerTaches, ajouterPhotoTache: ajouterPhotoTache, retirerPhotoTache: retirerPhotoTache, enregistrerBilan: enregistrerBilan, supprimerBilan: supprimerBilan, enregistrerAvalanche: enregistrerAvalanche, supprimerAvalanche: supprimerAvalanche, ajouterPhotoAvalanche: ajouterPhotoAvalanche, retirerPhotoAvalanche: retirerPhotoAvalanche, enregistrerRecco: enregistrerRecco, supprimerRecco: supprimerRecco, enregistrerPanneau: enregistrerPanneau, meteoPanneau: meteoPanneau, bibleFichier: bibleFichier, assistant: assistant, annulerAssistant: annulerAssistant, enregistrerCleIA: enregistrerCleIA, etatIA: etatIA, enregistrerPente: enregistrerPente, supprimerPente: supprimerPente, photoPente: photoPente, traitsPente: traitsPente, importerPentes: importerPentes, historiquePente: historiquePente, vignettesPentes: vignettesPentes, notePente: notePente, supprimerPhotoPente: supprimerPhotoPente, deposerPreuve: deposerPreuve, listePreuves: listePreuves, cartePreuves: cartePreuves, marquerPreuve: marquerPreuve, verifierPreuves: verifierPreuves, heureServeur: heureServeur};
function doPost(e) {
  var out;
  try {
    var req = JSON.parse(e && e.postData && e.postData.contents || '{}');
    var f = API_[req.fn];
    if (!f) throw new Error('Fonction inconnue');
    out = { ok: true, data: f.apply(null, req.args || []) };
  } catch (err) {
    out = { ok: false, error: String(err && err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------------------------------------ Installation (et mise à jour) */

function installer() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  PropertiesService.getScriptProperties().setProperty('SS_ID', ss.getId());
  preparerOnglet_(ss, ONGLET_STOCK, COL_STOCK);
  preparerOnglet_(ss, ONGLET_QTE, COL_QTE);
  var lieux = preparerOnglet_(ss, ONGLET_LIEUX, COL_LIEUX);
  preparerOnglet_(ss, ONGLET_PREPS, COL_PREPS);
  preparerOnglet_(ss, ONGLET_CMD, COL_CMD);
  preparerOnglet_(ss, ONGLET_DEM, COL_DEM);
  preparerOnglet_(ss, ONGLET_TACHES, COL_TACHES);
  var zs = preparerOnglet_(ss, ONGLET_ZONES, COL_ZONES);
  if (zs.getLastRow() < 2) ZONES_DEPART.forEach(function (z, i) { zs.appendRow([z, i + 1]); });
  var plan = preparerOnglet_(ss, ONGLET_PLAN, COL_PLAN);
  plan.getRange('B:D').setNumberFormat('@'); // dates et heures gardées en texte
  var form = preparerOnglet_(ss, ONGLET_FORM, COL_FORM);
  if (form.getLastRow() <= 1) RUBRIQUES_DEPART.forEach(function (r, i) { form.appendRow(['r' + i + Date.now().toString(36), r, '', '', '', i]); });
  var mouv = preparerOnglet_(ss, ONGLET_MOUV, COL_MOUV);
  // Mise à jour d'une ancienne version : colonne « lieu » dans Mouvements
  var enteteMouv = mouv.getDataRange().getValues()[0] || [];
  if (enteteMouv.indexOf('lieu') < 0) mouv.getRange(1, enteteMouv.length + 1).setValue('lieu');

  var conf = ss.getSheetByName(ONGLET_CONFIG) || ss.insertSheet(ONGLET_CONFIG);
  if (conf.getLastRow() === 0) {
    conf.appendRow(['reglage', 'valeur', 'explication']);
    conf.appendRow(['code_equipe', 'A-CHANGER-' + Math.random().toString(36).slice(2, 8), "Code à taper une seule fois sur chaque téléphone. Laisser la case vide pour un accès sans code."]);
    conf.setFrozenRows(1);
  }
  if (!reglage_('dossier_photos')) {
    var dossier = DriveApp.createFolder('Appli pisteurs - photos');
    conf.appendRow(['dossier_photos', dossier.getId(), 'Dossier Google Drive des photos. Ne pas modifier.']);
  }
  if (lieux.getLastRow() <= 1) LIEUX_DEPART.forEach(function (l) { lieux.appendRow([l, '']); });

  var stock = ss.getSheetByName(ONGLET_STOCK);
  if (stock.getLastRow() <= 1) {
    STOCK_DEPART.forEach(function (r, i) { stock.appendRow([r[0], r[1], r[2], r[3], r[4], r[5], r[6], '', i + 1]); });
  }
  // Les articles sans aucune quantité par lieu : leur quantité va dans le premier lieu
  var premier = listeLieux_()[0].name, qte = quantites_();
  lire_(ONGLET_STOCK).forEach(function (a) {
    if (!qte[String(a.id)]) ss.getSheetByName(ONGLET_QTE).appendRow([String(a.id), premier, nombre_(a.quantite)]);
  });

  ['Feuille 1', 'Sheet1', 'Feuille1'].forEach(function (n) {
    var s = ss.getSheetByName(n);
    if (s && s.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(s);
  });
  return 'Installation terminée';
}

function preparerOnglet_(ss, nom, colonnes) {
  var s = ss.getSheetByName(nom) || ss.insertSheet(nom);
  if (s.getLastRow() === 0) { s.appendRow(colonnes); s.setFrozenRows(1); }
  return s;
}

/* ------------------------------------------------------------ Outils */

function classeur_() {
  var id = PropertiesService.getScriptProperties().getProperty('SS_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}
function onglet_(nom) {
  var s = classeur_().getSheetByName(nom);
  if (!s) throw new Error("L'onglet « " + nom + " » est introuvable. Lance « installer » dans Apps Script.");
  return s;
}
function reglage_(cle) {
  var s = classeur_().getSheetByName(ONGLET_CONFIG);
  if (!s || s.getLastRow() === 0) return '';
  var v = s.getDataRange().getValues();
  for (var i = 0; i < v.length; i++) if (String(v[i][0]).trim() === cle) return String(v[i][1]).trim();
  return '';
}
function verifier_(code) {
  var attendu = reglage_('code_equipe');
  if (attendu && String(code || '').trim().toLowerCase() !== attendu.toLowerCase()) throw new Error('CODE');
}
function lire_(nom) {
  var v = onglet_(nom).getDataRange().getValues();
  var entete = v.shift() || [];
  var out = [];
  v.forEach(function (r, i) {
    if (r[0] === '' || r[0] === null) return;
    var o = { _ligne: i + 2 };
    entete.forEach(function (k, j) { o[k] = r[j]; });
    out.push(o);
  });
  return out;
}
function nombre_(x) { var n = Number(x); return isFinite(n) ? n : 0; }
function ms_(d) { return d instanceof Date ? d.getTime() : nombre_(d); }
function json_(s, defaut) { try { return s ? JSON.parse(s) : defaut; } catch (e) { return defaut; } }
function colStock_(nom) { return COL_STOCK.indexOf(nom) + 1; }
function colPrep_(nom) { return COL_PREPS.indexOf(nom) + 1; }
function verrou_(fn) {
  var l = LockService.getScriptLock();
  l.waitLock(20000);
  try { return fn(); } finally { l.releaseLock(); }
}
function article_(id) {
  var a = lire_(ONGLET_STOCK).filter(function (o) { return String(o.id) === String(id); })[0];
  if (!a) throw new Error('Article introuvable. Il a peut-être été supprimé : recharge la page.');
  return a;
}
function prep_(id) {
  var p = lire_(ONGLET_PREPS).filter(function (o) { return String(o.id) === String(id); })[0];
  if (!p) throw new Error('Préparation introuvable. Elle a peut-être été supprimée : recharge la page.');
  return p;
}
function photos_(a) { return String(a.photos || '').split(',').map(function (x) { return x.trim(); }).filter(String); }

/* ---------- Lieux et quantités par lieu */

function listeLieux_() {
  var l = lire_(ONGLET_LIEUX).map(function (o) { return { name: String(o.lieu).trim(), last: ms_(o.dernier_comptage), _ligne: o._ligne }; })
    .filter(function (o) { return o.name; });
  if (!l.length) throw new Error("Aucun lieu dans l'onglet Lieux. Lance « installer » dans Apps Script.");
  return l;
}
function lieuValide_(lieu) {
  var l = listeLieux_(), trouve = l.filter(function (x) { return x.name === lieu; })[0];
  if (!trouve) throw new Error("Lieu inconnu : recharge la page.");
  return trouve;
}
// { article_id: { lieu: { n: quantité, ligne: n° de ligne } } }
function quantites_() {
  var q = {};
  lire_(ONGLET_QTE).forEach(function (o) {
    var id = String(o.article_id), lieu = String(o.lieu);
    (q[id] = q[id] || {})[lieu] = { n: nombre_(o.quantite), ligne: o._ligne };
  });
  return q;
}
function ecrireQte_(q, id, lieu, n) {
  var s = onglet_(ONGLET_QTE), c = q[id] && q[id][lieu];
  if (c) { s.getRange(c.ligne, 3).setValue(n); c.n = n; }
  else { s.appendRow([id, lieu, n]); (q[id] = q[id] || {})[lieu] = { n: n, ligne: s.getLastRow() }; }
}
function total_(q, id) { var t = 0, m = q[id] || {}; Object.keys(m).forEach(function (k) { t += m[k].n; }); return t; }
function majTotal_(q, a) { onglet_(ONGLET_STOCK).getRange(a._ligne, colStock_('quantite')).setValue(total_(q, String(a.id))); }
function noterMouvement_(a, delta, ou, lieu) {
  if (!delta) return;
  onglet_(ONGLET_MOUV).appendRow([new Date(), String(a.id), String(a.nom), delta, String(ou || '').slice(0, 80), lieu || '']);
}

/* ------------------------------------------------------------ Lecture */

function donnees(code) {
  verifier_(code);
  var lieux = listeLieux_(), q = quantites_();
  var stock = lire_(ONGLET_STOCK).map(function (o) {
    var id = String(o.id), par = {};
    lieux.forEach(function (l) { par[l.name] = q[id] && q[id][l.name] ? q[id][l.name].n : 0; });
    return {
      id: id, name: String(o.nom), cat: CATEGORIES.indexOf(String(o.categorie)) >= 0 ? String(o.categorie) : 'Autre',
      qty: total_(q, id), par: par, min: nombre_(o.rouge_a), alert: nombre_(o.jaune_a), max: nombre_(o.plein),
      photos: photos_(o), order: nombre_(o.ordre)
    };
  }).sort(function (a, b) { return a.order - b.order; });
  var preps = lire_(ONGLET_PREPS).map(function (o) {
    return {
      id: String(o.id), title: String(o.titre || 'Préparation piste'), lines: json_(o.lignes, []), got: json_(o.pris, {}),
      done: String(o.statut) === 'sortie', created: ms_(o.cree_le), doneAt: ms_(o.sortie_le)
    };
  }).sort(function (a, b) { return b.created - a.created; });
  var mouv = lire_(ONGLET_MOUV).slice(-60).reverse().map(function (o) {
    return { at: ms_(o.date), id: String(o.article_id), name: String(o.article), delta: nombre_(o.mouvement), where: String(o.ou || ''), lieu: String(o.lieu || '') };
  });
  var cmds = lire_(ONGLET_CMD).map(function (o) {
    return { id: String(o.id), from: String(o.de), to: String(o.vers), note: String(o.note || ''), lines: json_(o.lignes, []),
      status: String(o.statut || 'a_monter'), created: ms_(o.cree_le), takenAt: ms_(o.pris_le), doneAt: ms_(o.livre_le) };
  }).sort(function (a, b) { return b.created - a.created; }).slice(0, 60);
  var formation = lire_(ONGLET_FORM).map(function (o) {
    return { id: String(o.id), rub: String(o.rubrique || '').trim(), title: String(o.titre || ''), url: String(o.lien || '').trim(), desc: String(o.description || ''), order: nombre_(o.ordre) };
  }).filter(function (x) { return x.rub; }).sort(function (a, b) { return a.order - b.order; });
  var depuis = new Date(Date.now() - 120 * 864e5), depuisTxt = Utilities.formatDate(depuis, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var events = lire_(ONGLET_PLAN).map(function (o) {
    return { id: String(o.id), date: txtDate_(o.date), start: txtHeure_(o.debut), end: txtHeure_(o.fin), title: String(o.titre || ''),
      cat: CATS_PLAN.indexOf(String(o.categorie)) >= 0 ? String(o.categorie) : 'autre', imp: o.important === true || String(o.important).toLowerCase() === 'oui',
      who: String(o.qui || ''), note: String(o.note || '') };
  }).filter(function (e) { return e.date >= depuisTxt; });
  return { stock: stock, lieux: lieux.map(function (l) { return { name: l.name, last: l.last }; }), preps: preps, moves: mouv, orders: cmds, formation: formation, events: events, planjour: planJour_(), taches: taches_(), zones: zones_(), bilans: bilans_(), avalanches: avalanches_(), pentes: pentes_(), preuvesInfo: preuvesInfo_(), recco: recco_(), reccoPages: reccoPages_(), panneau: panneau_(), bible: bible_(),
    demandes: lire_(ONGLET_DEM).map(function (o) {
      return { id: String(o.id), title: String(o.titre || ''), type: o.type === 'acheter' ? 'acheter' : 'fabriquer', qty: Math.max(1, Number(o.quantite) || 1),
        by: String(o.demande_par || ''), owner: String(o.qui || ''), note: String(o.note || ''), status: STATUTS_DEM.indexOf(String(o.statut)) >= 0 ? String(o.statut) : 'demande',
        photos: String(o.photos || '').split(',').filter(String), created: o.cree_le instanceof Date ? o.cree_le.getTime() : Number(o.cree_le) || 0,
        updated: o.maj_le instanceof Date ? o.maj_le.getTime() : Number(o.maj_le) || 0 };
    }) };
}

/* ------------------------------------------------------------ Stock */

function mouvement(code, id, delta, ou, lieu) {
  verifier_(code);
  return verrou_(function () {
    var a = article_(id), L = lieuValide_(lieu).name, q = quantites_();
    var avant = q[a.id] && q[a.id][L] ? q[a.id][L].n : 0, apres = Math.max(0, avant + Math.round(nombre_(delta)));
    ecrireQte_(q, String(a.id), L, apres);
    majTotal_(q, a);
    noterMouvement_(a, apres - avant, ou, L);
    return donnees(code);
  });
}

// Comptage d'un lieu : valeurs = { article_id: quantité comptée }
function comptage(code, lieu, valeurs) {
  verifier_(code);
  return verrou_(function () {
    var L = lieuValide_(lieu), q = quantites_();
    lire_(ONGLET_STOCK).forEach(function (a) {
      var id = String(a.id);
      if (!valeurs || !(id in valeurs) || valeurs[id] === '' || valeurs[id] === null) return;
      var n = Math.max(0, Math.round(nombre_(valeurs[id]))), avant = q[id] && q[id][L.name] ? q[id][L.name].n : 0;
      if (n === avant) return;
      ecrireQte_(q, id, L.name, n);
      majTotal_(q, a);
      noterMouvement_(a, n - avant, 'Comptage', L.name);
    });
    onglet_(ONGLET_LIEUX).getRange(L._ligne, 2).setValue(new Date());
    return donnees(code);
  });
}

function enregistrerArticle(code, art) {
  verifier_(code);
  var nom = String(art && art.name || '').trim().slice(0, 60);
  if (!nom) throw new Error("Donne un nom à l'article.");
  var cat = CATEGORIES.indexOf(art.cat) >= 0 ? art.cat : 'Autre';
  var rouge = Math.max(0, Math.round(nombre_(art.min))), jaune = Math.max(rouge, Math.round(nombre_(art.alert)));
  var plein = Math.max(0, Math.round(nombre_(art.max)));
  return verrou_(function () {
    var s = onglet_(ONGLET_STOCK);
    if (art.id) {
      var a = article_(art.id);
      s.getRange(a._ligne, 2, 1, 2).setValues([[nom, cat]]);
      s.getRange(a._ligne, 5, 1, 3).setValues([[rouge, jaune, plein]]);
    } else {
      var L = lieuValide_(art.lieu || listeLieux_()[0].name).name, n = Math.max(0, Math.round(nombre_(art.qty)));
      var id = nom.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) +
        '-' + Date.now().toString(36);
      s.appendRow([id, nom, cat, n, rouge, jaune, Math.max(plein, n), '', Date.now()]);
      onglet_(ONGLET_QTE).appendRow([id, L, n]);
    }
    return donnees(code);
  });
}

function supprimerArticle(code, id) {
  verifier_(code);
  return verrou_(function () {
    var a = article_(id);
    photos_(a).forEach(function (p) { try { DriveApp.getFileById(p).setTrashed(true); } catch (e) {} });
    var qs = onglet_(ONGLET_QTE), lignes = lire_(ONGLET_QTE).filter(function (o) { return String(o.article_id) === String(id); })
      .map(function (o) { return o._ligne; }).sort(function (x, y) { return y - x; });
    lignes.forEach(function (n) { qs.deleteRow(n); });
    onglet_(ONGLET_STOCK).deleteRow(a._ligne);
    return donnees(code);
  });
}

/* ------------------------------------------------------------ Photos */

function ajouterPhoto(code, id, dataUrl) {
  verifier_(code);
  var m = String(dataUrl || '').match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!m) throw new Error('Format de photo non pris en charge : choisis une photo JPEG ou PNG.');
  article_(id);
  var blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], 'photo-' + id + '-' + Date.now() + '.jpg');
  var fichier = DriveApp.getFolderById(reglage_('dossier_photos')).createFile(blob);
  fichier.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return verrou_(function () {
    var a = article_(id), liste = photos_(a);
    liste.push(fichier.getId());
    onglet_(ONGLET_STOCK).getRange(a._ligne, colStock_('photos')).setValue(liste.join(','));
    return donnees(code);
  });
}

function retirerPhoto(code, id, photoId) {
  verifier_(code);
  return verrou_(function () {
    var a = article_(id), liste = photos_(a).filter(function (p) { return p !== photoId; });
    onglet_(ONGLET_STOCK).getRange(a._ligne, colStock_('photos')).setValue(liste.join(','));
    try { DriveApp.getFileById(photoId).setTrashed(true); } catch (e) {}
    return donnees(code);
  });
}

/* ------------------------------------------------------------ Préparations */

function enregistrerPrep(code, titre, lignes) {
  verifier_(code);
  var propres = (lignes || []).map(function (l) {
    return { id: String(l.id), name: String(l.name).slice(0, 60), qty: Math.max(1, Math.round(nombre_(l.qty))) };
  }).filter(function (l) { return l.id; });
  if (!propres.length) throw new Error('La liste est vide.');
  return verrou_(function () {
    onglet_(ONGLET_PREPS).appendRow(['p' + Date.now().toString(36), String(titre || '').trim().slice(0, 80) || 'Préparation piste',
      JSON.stringify(propres), '{}', 'preparee', new Date(), '']);
    return donnees(code);
  });
}

function cocher(code, prepId, ligneId, pris) {
  verifier_(code);
  return verrou_(function () {
    var p = prep_(prepId), got = json_(p.pris, {});
    if (pris) got[ligneId] = true; else delete got[ligneId];
    onglet_(ONGLET_PREPS).getRange(p._ligne, colPrep_('pris')).setValue(JSON.stringify(got));
    return donnees(code);
  });
}

// Retire le matériel du stock, pris dans le lieu choisi
function validerPrep(code, prepId, lieu) {
  verifier_(code);
  return verrou_(function () {
    var p = prep_(prepId);
    if (String(p.statut) === 'sortie') return donnees(code);
    var L = lieuValide_(lieu || listeLieux_()[0].name).name, titre = String(p.titre || 'Préparation piste'), q = quantites_();
    var stock = lire_(ONGLET_STOCK);
    json_(p.lignes, []).forEach(function (l) {
      var a = stock.filter(function (o) { return String(o.id) === String(l.id); })[0];
      if (!a) return;
      var avant = q[a.id] && q[a.id][L] ? q[a.id][L].n : 0, apres = Math.max(0, avant - nombre_(l.qty));
      ecrireQte_(q, String(a.id), L, apres);
      majTotal_(q, a);
      noterMouvement_(a, apres - avant, titre, L);
    });
    var ps = onglet_(ONGLET_PREPS);
    ps.getRange(p._ligne, colPrep_('statut')).setValue('sortie');
    ps.getRange(p._ligne, colPrep_('sortie_le')).setValue(new Date());
    return donnees(code);
  });
}

function supprimerPrep(code, prepId) {
  verifier_(code);
  return verrou_(function () {
    onglet_(ONGLET_PREPS).deleteRow(prep_(prepId)._ligne);
    return donnees(code);
  });
}

/* ------------------------------------------------------------ Commandes (matériel à monter) */

function cmd_(id) {
  var c = lire_(ONGLET_CMD).filter(function (o) { return String(o.id) === String(id); })[0];
  if (!c) throw new Error('Commande introuvable. Elle a peut-être été supprimée : recharge la page.');
  return c;
}
function colCmd_(nom) { return COL_CMD.indexOf(nom) + 1; }

function creerCommande(code, de, vers, note, lignes) {
  verifier_(code);
  var propres = (lignes || []).map(function (l) {
    return { id: String(l.id), name: String(l.name).slice(0, 60), qty: Math.max(1, Math.round(nombre_(l.qty))) };
  }).filter(function (l) { return l.id; });
  if (!propres.length) throw new Error('La liste est vide.');
  return verrou_(function () {
    lieuValide_(de);
    if (vers !== VERS_PISTE) lieuValide_(vers);
    if (vers === de) throw new Error('Le local de départ et d\'arrivée sont les mêmes.');
    onglet_(ONGLET_CMD).appendRow(['c' + Date.now().toString(36), de, vers, String(note || '').trim().slice(0, 120),
      JSON.stringify(propres), 'a_monter', new Date(), '', '']);
    return donnees(code);
  });
}

function prendreCommande(code, id) {
  verifier_(code);
  return verrou_(function () {
    var c = cmd_(id), s = onglet_(ONGLET_CMD);
    if (String(c.statut) === 'a_monter') {
      s.getRange(c._ligne, colCmd_('statut')).setValue('en_route');
      s.getRange(c._ligne, colCmd_('pris_le')).setValue(new Date());
    }
    return donnees(code);
  });
}

// Livrée : sort du local de départ et, si l'arrivée est un local, y entre
function livrerCommande(code, id) {
  verifier_(code);
  return verrou_(function () {
    var c = cmd_(id);
    if (String(c.statut) === 'livree') return donnees(code);
    var de = lieuValide_(String(c.de)).name, vers = String(c.vers), versLocal = vers !== VERS_PISTE;
    if (versLocal) vers = lieuValide_(vers).name;
    var q = quantites_(), stock = lire_(ONGLET_STOCK);
    json_(c.lignes, []).forEach(function (l) {
      var a = stock.filter(function (o) { return String(o.id) === String(l.id); })[0];
      if (!a) return;
      var id2 = String(a.id), avant = q[id2] && q[id2][de] ? q[id2][de].n : 0, apres = Math.max(0, avant - nombre_(l.qty)), parti = avant - apres;
      ecrireQte_(q, id2, de, apres);
      noterMouvement_(a, -parti, versLocal ? 'Commande vers ' + vers : 'Commande posée sur piste', de);
      if (versLocal && parti) {
        var dejaLa = q[id2] && q[id2][vers] ? q[id2][vers].n : 0;
        ecrireQte_(q, id2, vers, dejaLa + parti);
        noterMouvement_(a, parti, 'Commande depuis ' + de, vers);
      }
      majTotal_(q, a);
    });
    var s = onglet_(ONGLET_CMD);
    s.getRange(c._ligne, colCmd_('statut')).setValue('livree');
    s.getRange(c._ligne, colCmd_('livre_le')).setValue(new Date());
    return donnees(code);
  });
}

function supprimerCommande(code, id) {
  verifier_(code);
  return verrou_(function () {
    onglet_(ONGLET_CMD).deleteRow(cmd_(id)._ligne);
    return donnees(code);
  });
}

/* ------------------------------------------------------------ Formation (vidéos YouTube) */

function ajouterRubrique(code, nom) {
  verifier_(code);
  nom = String(nom || '').trim().slice(0, 40);
  if (!nom) throw new Error('Donne un nom à la rubrique.');
  return verrou_(function () {
    if (lire_(ONGLET_FORM).some(function (o) { return String(o.rubrique).toLowerCase() === nom.toLowerCase(); })) throw new Error('Cette rubrique existe déjà.');
    onglet_(ONGLET_FORM).appendRow(['r' + Date.now().toString(36), nom, '', '', '', Date.now()]);
    return donnees(code);
  });
}

function ajouterVideo(code, rubrique, titre, lien, description) {
  verifier_(code);
  titre = String(titre || '').trim().slice(0, 80); lien = String(lien || '').trim();
  if (!titre) throw new Error('Donne un titre à la vidéo.');
  if (!/^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//.test(lien)) throw new Error('Ce lien ne ressemble pas à un lien YouTube.');
  return verrou_(function () {
    onglet_(ONGLET_FORM).appendRow(['v' + Date.now().toString(36), String(rubrique || '').trim().slice(0, 40), titre, lien, String(description || '').trim().slice(0, 200), Date.now()]);
    return donnees(code);
  });
}

function supprimerVideo(code, id) {
  verifier_(code);
  return verrou_(function () {
    var v = lire_(ONGLET_FORM).filter(function (o) { return String(o.id) === String(id); })[0];
    if (v) onglet_(ONGLET_FORM).deleteRow(v._ligne);
    return donnees(code);
  });
}

/* ------------------------------------------------------------ Planning (calendrier partagé) */

function txtDate_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var s = String(v || '').trim(), m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return s;
  m = s.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})$/); // 05/11/2026 tapé à la main dans le tableau
  return m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : '';
}
function txtHeure_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'HH:mm');
  var m = String(v || '').trim().match(/^(\d{1,2})[:h](\d{2})?$/);
  return m ? ('0' + m[1]).slice(-2) + ':' + (m[2] || '00') : '';
}

function enregistrerEvenement(code, ev) {
  verifier_(code);
  var titre = String(ev && ev.title || '').trim().slice(0, 80);
  if (!titre) throw new Error("Donne un titre à l'événement.");
  var date = txtDate_(ev.date);
  if (!date) throw new Error('Choisis un jour.');
  var debut = txtHeure_(ev.start), fin = txtHeure_(ev.end);
  if (debut && fin && fin < debut) throw new Error("L'heure de fin est avant le début.");
  var cat = CATS_PLAN.indexOf(ev.cat) >= 0 ? ev.cat : 'autre';
  var ligne = [date, debut, fin, titre, cat, ev.imp ? 'oui' : 'non', String(ev.who || '').trim().slice(0, 80), String(ev.note || '').trim().slice(0, 300)];
  return verrou_(function () {
    var s = onglet_(ONGLET_PLAN);
    if (ev.id) {
      var o = lire_(ONGLET_PLAN).filter(function (x) { return String(x.id) === String(ev.id); })[0];
      if (!o) throw new Error('Événement introuvable. Il a peut-être été supprimé : recharge la page.');
      s.getRange(o._ligne, 2, 1, 8).setValues([ligne]);
    } else {
      s.appendRow(['e' + Date.now().toString(36)].concat(ligne).concat([new Date()]));
    }
    return donnees(code);
  });
}

function supprimerEvenement(code, id) {
  verifier_(code);
  return verrou_(function () {
    var o = lire_(ONGLET_PLAN).filter(function (x) { return String(x.id) === String(id); })[0];
    if (o) onglet_(ONGLET_PLAN).deleteRow(o._ligne);
    return donnees(code);
  });
}

/* ------------------------------------------------------------ Achats & fabrication */

function demande_(id) {
  var o = lire_(ONGLET_DEM).filter(function (x) { return String(x.id) === String(id); })[0];
  if (!o) throw new Error('Demande introuvable. Elle a peut-être été supprimée : recharge la page.');
  return o;
}

function enregistrerDemande(code, dm) {
  verifier_(code);
  dm = dm || {};
  var titre = String(dm.title || '').trim().slice(0, 80);
  if (!titre) throw new Error('Donne un titre à la demande.');
  var id = String(dm.id || '').replace(/[^A-Za-z0-9_-]/g, '') || ('d' + Date.now().toString(36));
  var champs = [titre, dm.type === 'acheter' ? 'acheter' : 'fabriquer', Math.max(1, Math.round(Number(dm.qty)) || 1),
    String(dm.by || '').trim().slice(0, 60), String(dm.owner || '').trim().slice(0, 60), String(dm.note || '').trim().slice(0, 600)];
  return verrou_(function () {
    var s = onglet_(ONGLET_DEM), o = lire_(ONGLET_DEM).filter(function (x) { return String(x.id) === id; })[0];
    if (o) {
      s.getRange(o._ligne, 2, 1, 6).setValues([champs]);
      s.getRange(o._ligne, COL_DEM.indexOf('maj_le') + 1).setValue(Date.now());
    } else {
      s.appendRow([id].concat(champs).concat(['demande', '', Date.now(), Date.now()]));
    }
    return donnees(code);
  });
}

function statutDemande(code, id, statut) {
  verifier_(code);
  if (STATUTS_DEM.indexOf(statut) < 0) throw new Error('Statut inconnu.');
  return verrou_(function () {
    var o = demande_(id), s = onglet_(ONGLET_DEM);
    s.getRange(o._ligne, COL_DEM.indexOf('statut') + 1).setValue(statut);
    s.getRange(o._ligne, COL_DEM.indexOf('maj_le') + 1).setValue(Date.now());
    return donnees(code);
  });
}

function supprimerDemande(code, id) {
  verifier_(code);
  return verrou_(function () {
    var o = lire_(ONGLET_DEM).filter(function (x) { return String(x.id) === String(id); })[0];
    if (o) {
      String(o.photos || '').split(',').filter(String).forEach(function (p) { try { DriveApp.getFileById(p).setTrashed(true); } catch (e) {} });
      onglet_(ONGLET_DEM).deleteRow(o._ligne);
    }
    return donnees(code);
  });
}

function ajouterPhotoDemande(code, id, dataUrl) {
  verifier_(code);
  var m = String(dataUrl || '').match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!m) throw new Error('Format de photo non pris en charge : choisis une photo JPEG ou PNG.');
  demande_(id);
  var blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], 'demande-' + id + '-' + Date.now() + '.jpg');
  var fichier = DriveApp.getFolderById(reglage_('dossier_photos')).createFile(blob);
  fichier.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return verrou_(function () {
    var o = demande_(id), liste = String(o.photos || '').split(',').filter(String);
    liste.push(fichier.getId());
    onglet_(ONGLET_DEM).getRange(o._ligne, COL_DEM.indexOf('photos') + 1).setValue(liste.join(','));
    return donnees(code);
  });
}

function retirerPhotoDemande(code, id, photoId) {
  verifier_(code);
  return verrou_(function () {
    var o = demande_(id), liste = String(o.photos || '').split(',').filter(function (p) { return p && p !== photoId; });
    onglet_(ONGLET_DEM).getRange(o._ligne, COL_DEM.indexOf('photos') + 1).setValue(liste.join(','));
    try { DriveApp.getFileById(photoId).setTrashed(true); } catch (e) {}
    return donnees(code);
  });
}

// Renvoie une photo (Drive) en texte, pour la télécharger ou la mettre dans un PDF depuis le site
function photoBase64(code, photoId) {
  verifier_(code);
  var b = DriveApp.getFileById(photoId).getBlob();
  return 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes());
}

/* ------------------------------------------------------------ Planning du personnel (photo ou PDF) */

function ecrireReglage_(cle, valeur) {
  var s = classeur_().getSheetByName(ONGLET_CONFIG), v = s.getLastRow() ? s.getDataRange().getValues() : [];
  for (var i = 0; i < v.length; i++) if (String(v[i][0]).trim() === cle) { s.getRange(i + 1, 2).setValue(valeur); return; }
  s.appendRow([cle, valeur]);
}
function planJour_() {
  try { var o = JSON.parse(reglage_('planning_jour') || 'null'); return o && o.pages && o.pages.length ? o : null; } catch (e) { return null; }
}
function fichierDrive_(dataUrl, nom) {
  var m = String(dataUrl || '').match(/^data:([\w\/.+-]+);base64,(.+)$/);
  if (!m || !/^(image\/(jpeg|png|webp)|application\/pdf)$/.test(m[1])) throw new Error('Format non pris en charge : choisis un JPEG, un PNG ou un PDF.');
  var f = DriveApp.getFolderById(reglage_('dossier_photos')).createFile(Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], nom));
  f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return f.getId();
}
function enregistrerPlanning(code, pj) {
  verifier_(code);
  pj = pj || {};
  if (!pj.pages || !pj.pages.length) throw new Error('Format non pris en charge : choisis un JPEG, un PNG ou un PDF.');
  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd-HHmm');
  var pages = pj.pages.slice(0, 6).map(function (u, i) { return fichierDrive_(u, 'planning-' + stamp + '-p' + (i + 1) + '.jpg'); });
  var file = pj.type === 'pdf' && pj.file ? fichierDrive_(pj.file, 'planning-' + stamp + '.pdf') : pages[0];
  return verrou_(function () {
    var ancien = planJour_();
    ecrireReglage_('planning_jour', JSON.stringify({ type: pj.type === 'pdf' ? 'pdf' : 'image', file: file, pages: pages, name: String(pj.name || '').slice(0, 80), updated: Date.now() }));
    if (ancien) [ancien.file].concat(ancien.pages || []).forEach(function (id) { if (id && id !== file && pages.indexOf(id) < 0) { try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {} } });
    return donnees(code);
  });
}

/* ------------------------------------------------------------ Transfert depuis l'appli Claude (une seule fois) */
// p = les données de l'appli Claude (même forme que donnees()) + p.photos = { ancien_id: dataUrl }
function importerDonnees(code, p) {
  verifier_(code);
  if (!p || !p.stock || !p.lieux) throw new Error('Fichier de transfert illisible.');
  var ph = p.photos || {}, map = {};
  function photo(id, nom) {
    if (!id) return '';
    if (map[id] === undefined) { map[id] = ''; if (ph[id]) { try { map[id] = fichierDrive_(ph[id], nom); } catch (e) {} } }
    return map[id];
  }
  function photos(ids, nom) { return (ids || []).map(function (id, i) { return photo(id, nom + '-' + (i + 1)); }).filter(String); }
  var d = function (ms) { return ms ? new Date(Number(ms)) : ''; };
  var stockPh = {}; p.stock.forEach(function (a) { stockPh[a.id] = photos(a.photos, 'photo-' + a.id).join(','); });
  var demPh = {}; (p.demandes || []).forEach(function (x) { demPh[x.id] = photos(x.photos, 'demande-' + x.id).join(','); });
  var pj = null;
  if (p.planjour && p.planjour.pages && p.planjour.pages.length) {
    var pages = photos(p.planjour.pages, 'planning');
    var file = p.planjour.type === 'pdf' ? photo(p.planjour.file, 'planning-pdf') : pages[0];
    if (pages.length) pj = { type: p.planjour.type === 'pdf' && file ? 'pdf' : 'image', file: file || pages[0], pages: pages, name: String(p.planjour.name || ''), updated: Number(p.planjour.updated) || Date.now() };
  }
  function remplacer(nom, rows) {
    var s = onglet_(nom), n = s.getLastRow();
    if (n > 1) s.getRange(2, 1, n - 1, Math.max(1, s.getLastColumn())).clearContent();
    if (rows.length) s.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }
  return verrou_(function () {
    remplacer(ONGLET_LIEUX, p.lieux.map(function (l) { return [String(l.name), d(l.last)]; }));
    remplacer(ONGLET_STOCK, p.stock.map(function (a, i) {
      var tot = 0; Object.keys(a.par || {}).forEach(function (k) { tot += nombre_(a.par[k]); });
      return [String(a.id), String(a.name), CATEGORIES.indexOf(a.cat) >= 0 ? a.cat : 'Autre', tot, nombre_(a.min), nombre_(a.alert), nombre_(a.max), stockPh[a.id] || '', nombre_(a.order) || i + 1];
    }));
    var qte = []; p.stock.forEach(function (a) { Object.keys(a.par || {}).forEach(function (L) { if (nombre_(a.par[L])) qte.push([String(a.id), L, nombre_(a.par[L])]); }); });
    remplacer(ONGLET_QTE, qte);
    remplacer(ONGLET_PREPS, (p.preps || []).map(function (x) { return [x.id, x.title, JSON.stringify(x.lines || []), JSON.stringify(x.got || {}), x.done ? 'sortie' : 'preparee', d(x.created), d(x.doneAt)]; }));
    remplacer(ONGLET_MOUV, (p.moves || []).slice().reverse().map(function (m) { return [d(m.at), String(m.id || ''), String(m.name || ''), nombre_(m.delta), String(m.where || ''), String(m.lieu || '')]; }));
    remplacer(ONGLET_CMD, (p.orders || []).map(function (o) { return [o.id, o.from, o.to, o.note || '', JSON.stringify(o.lines || []), o.status || 'a_monter', d(o.created), d(o.takenAt), d(o.doneAt)]; }));
    remplacer(ONGLET_FORM, (p.formation || []).filter(function (f) { return f.rub; }).map(function (f, i) { return [String(f.id), f.rub, f.title || '', f.url || '', f.desc || '', i]; }));
    remplacer(ONGLET_PLAN, (p.events || []).map(function (e) { return [e.id, txtDate_(e.date), txtHeure_(e.start), txtHeure_(e.end), e.title, CATS_PLAN.indexOf(e.cat) >= 0 ? e.cat : 'autre', e.imp ? 'oui' : 'non', e.who || '', e.note || '', new Date()]; }));
    remplacer(ONGLET_TACHES, (p.taches || []).map(function (t) { return [t.id, t.text, t.zone || 'Tableau', PRIOS.indexOf(t.prio) >= 0 ? t.prio : 'normal', t.state || 'afaire', t.by || '', t.doneBy || '', t.doneAt || '', t.createdBy || '', t.created || Date.now(), t.mat ? JSON.stringify(t.mat) : '', Date.now()]; }));
    if (p.zones && p.zones.length) remplacer(ONGLET_ZONES, p.zones.map(function (z, i) { return [String(z), i + 1]; }));
    remplacer(ONGLET_DEM, (p.demandes || []).map(function (x) { return [x.id, x.title, x.type === 'acheter' ? 'acheter' : 'fabriquer', Math.max(1, nombre_(x.qty)), x.by || '', x.owner || '', x.note || '', STATUTS_DEM.indexOf(x.status) >= 0 ? x.status : 'demande', demPh[x.id] || '', x.created || Date.now(), x.updated || Date.now()]; }));
    if (pj) ecrireReglage_('planning_jour', JSON.stringify(pj));
    return donnees(code);
  });
}

/* ------------------------------------------------------------ Tâches de l'équipe */

function zones_() {
  var z = lire_(ONGLET_ZONES).filter(function (o) { return String(o.zone).trim(); });
  z.sort(function (a, b) { return (Number(a.ordre) || 999) - (Number(b.ordre) || 999); });
  return z.map(function (o) { return String(o.zone).trim(); });
}
function temps_(v) { return v instanceof Date ? v.getTime() : Number(v) || 0; }
function taches_() {
  var limite = Date.now() - 60 * 864e5; // les tâches faites depuis plus de 60 jours ne sont plus envoyées
  return lire_(ONGLET_TACHES).map(function (o) {
    var mat = null; try { mat = o.materiel ? JSON.parse(o.materiel) : null; } catch (e) {}
    return { id: String(o.id), text: String(o.texte || ''), zone: String(o.zone || 'Autre'), prio: PRIOS.indexOf(String(o.priorite)) >= 0 ? String(o.priorite) : 'normal',
      state: ['afaire', 'pris', 'fait'].indexOf(String(o.etat)) >= 0 ? String(o.etat) : 'afaire', by: String(o.pris_par || ''), doneBy: String(o.fait_par || ''),
      doneAt: temps_(o.fait_le), createdBy: String(o.cree_par || ''), created: temps_(o.cree_le), mat: mat,
      ord: o.ordre === '' || o.ordre == null || !isFinite(Number(o.ordre)) ? null : Number(o.ordre), photos: photos_(o) };
  }).filter(function (t) { return t.state !== 'fait' || t.doneAt > limite; });
}
function tache_(id) {
  var o = lire_(ONGLET_TACHES).filter(function (x) { return String(x.id) === String(id); })[0];
  if (!o) throw new Error('Tâche introuvable. Elle a peut-être été supprimée : recharge la page.');
  return o;
}
function colT_(nom) { return COL_TACHES.indexOf(nom) + 1; }
function majTache_(o, champs) {
  var s = onglet_(ONGLET_TACHES);
  Object.keys(champs).forEach(function (k) { s.getRange(o._ligne, colT_(k)).setValue(champs[k]); });
  s.getRange(o._ligne, colT_('maj_le')).setValue(Date.now());
}

function enregistrerTache(code, t) {
  verifier_(code);
  t = t || {};
  var texte = String(t.text || '').trim().slice(0, 300);
  if (!texte) throw new Error("Écris ce qu'il faut faire.");
  var zone = String(t.zone || '').trim() || 'Tableau';
  var prio = PRIOS.indexOf(t.prio) >= 0 ? t.prio : 'normal';
  var mat = t.mat && t.mat.id ? JSON.stringify({ id: String(t.mat.id), qty: Math.max(1, Math.round(nombre_(t.mat.qty)) || 1), lieu: lieuValide_(t.mat.lieu).name }) : '';
  var id = String(t.id || '').replace(/[^A-Za-z0-9_-]/g, '') || ('t' + Date.now().toString(36));
  return verrou_(function () {
    var o = lire_(ONGLET_TACHES).filter(function (x) { return String(x.id) === id; })[0];
    if (o) majTache_(o, { texte: texte, zone: zone, priorite: prio, materiel: mat });
    else onglet_(ONGLET_TACHES).appendRow([id, texte, zone, prio, 'afaire', '', '', '', String(t.createdBy || '').slice(0, 30), Date.now(), mat, Date.now()]);
    return donnees(code);
  });
}
// ---------- Bilans victime (xABCDE) : partagés pour être lus en direct, effacés après 24 h ----------
var ONGLET_BILANS = 'Bilans', COL_BILANS = ['id', 'debut', 'par', 'maj_le', 'json'], BILAN_VIE = 24 * 3600 * 1000;
function ongletBilans_() {
  var c = classeur_(), s = c.getSheetByName(ONGLET_BILANS);
  if (!s) { s = c.insertSheet(ONGLET_BILANS); s.getRange(1, 1, 1, COL_BILANS.length).setValues([COL_BILANS]); }
  return s;
}
function bilans_() {
  if (!classeur_().getSheetByName(ONGLET_BILANS)) return [];
  var lim = Date.now() - BILAN_VIE;
  return lire_(ONGLET_BILANS).map(function (o) {
    var b = null; try { b = JSON.parse(String(o.json || '')); } catch (e) {}
    return { id: String(o.id), start: Number(o.debut) || 0, by: String(o.par || ''), upd: Number(o.maj_le) || 0, b: b };
  }).filter(function (x) { return x.b && x.start > lim; }).sort(function (a, b) { return b.start - a.start; });
}
function purgerBilans_(s) {
  var lim = Date.now() - BILAN_VIE, rows = lire_(ONGLET_BILANS);
  for (var i = rows.length - 1; i >= 0; i--) if ((Number(rows[i].debut) || 0) < lim) s.deleteRow(rows[i]._ligne);
}
function enregistrerBilan(code, bl, par) {
  verifier_(code);
  return verrou_(function () {
    var s = ongletBilans_(), id = String(bl && bl.id || '');
    if (!/^b[a-z0-9]{4,20}$/.test(id)) throw new Error('Bilan sans identifiant.');
    var json = JSON.stringify(bl); if (json.length > 45000) throw new Error('Bilan trop long.');
    purgerBilans_(s);
    var ligne = 0; lire_(ONGLET_BILANS).forEach(function (o) { if (String(o.id) === id) ligne = o._ligne; });
    var vals = [id, Number(bl.start) || Date.now(), String(par || '').slice(0, 60), Date.now(), json];
    if (ligne) s.getRange(ligne, 1, 1, vals.length).setValues([vals]); else s.appendRow(vals);
    return { bilans: bilans_() };
  });
}
function supprimerBilan(code, id) {
  verifier_(code);
  return verrou_(function () {
    var s = ongletBilans_();
    lire_(ONGLET_BILANS).reverse().forEach(function (o) { if (String(o.id) === String(id)) s.deleteRow(o._ligne); });
    return { bilans: bilans_() };
  });
}
// Ordre des tâches choisi en les déplaçant : paires = [{ id, ord }]
function ordonnerTaches(code, paires) {
  verifier_(code);
  return verrou_(function () {
    var s = onglet_(ONGLET_TACHES), col = COL_TACHES.indexOf('ordre') + 1;
    if (String(s.getRange(1, col).getValue()) !== 'ordre') s.getRange(1, col).setValue('ordre');
    var lignes = {}; lire_(ONGLET_TACHES).forEach(function (o) { lignes[String(o.id)] = o._ligne; });
    (paires || []).slice(0, 200).forEach(function (p) {
      var l = lignes[String(p && p.id)], n = Number(p && p.ord);
      if (l && isFinite(n)) s.getRange(l, col).setValue(n);
    });
    return donnees(code);
  });
}
// prenom vide = la tâche est lâchée (remise à faire)
function prendreTache(code, id, prenom) {
  verifier_(code);
  return verrou_(function () {
    var o = tache_(id), p = String(prenom || '').trim().slice(0, 30);
    if (String(o.etat) === 'fait') throw new Error('Tâche introuvable. Elle a peut-être déjà été faite : recharge la page.');
    majTache_(o, { etat: p ? 'pris' : 'afaire', pris_par: p });
    return donnees(code);
  });
}
function terminerTache(code, id, prenom, sortirStock) {
  verifier_(code);
  return verrou_(function () {
    var o = tache_(id), p = String(prenom || '').trim().slice(0, 30);
    if (String(o.etat) === 'fait') return donnees(code);
    majTache_(o, { etat: 'fait', fait_par: p, fait_le: Date.now() });
    try { purgerTaches_(); } catch (e) {}
    if (sortirStock && o.materiel) {
      var m = JSON.parse(o.materiel), a = article_(m.id), L = lieuValide_(m.lieu).name, q = quantites_();
      var avant = q[a.id] && q[a.id][L] ? q[a.id][L].n : 0, apres = Math.max(0, avant - Math.max(1, Math.round(nombre_(m.qty)) || 1));
      ecrireQte_(q, String(a.id), L, apres);
      majTotal_(q, a);
      noterMouvement_(a, apres - avant, ('Tâche : ' + o.texte).slice(0, 80), L);
    }
    return donnees(code);
  });
}
function rouvrirTache(code, id) {
  verifier_(code);
  return verrou_(function () { majTache_(tache_(id), { etat: 'afaire', pris_par: '', fait_par: '', fait_le: '' }); return donnees(code); });
}
function supprimerTache(code, id) {
  verifier_(code);
  return verrou_(function () {
    var o = lire_(ONGLET_TACHES).filter(function (x) { return String(x.id) === String(id); })[0];
    if (o) { jeterPhotos_(o); onglet_(ONGLET_TACHES).deleteRow(o._ligne); }
    return donnees(code);
  });
}
// ---------- Photos des tâches : réduites sur le téléphone, rangées dans le dossier photos, jetées avec la tâche ----------
var TACHE_PHOTOS_MAX = 3, TACHE_GARDE = 60 * 864e5;
function jeterPhotos_(o) { photos_(o).forEach(function (p) { try { DriveApp.getFileById(p).setTrashed(true); } catch (e) {} }); }
function colPhotosTache_() {
  var s = onglet_(ONGLET_TACHES), col = COL_TACHES.indexOf('photos') + 1;
  if (String(s.getRange(1, col).getValue()) !== 'photos') s.getRange(1, col).setValue('photos');
  return col;
}
// Les tâches faites depuis plus de 60 jours sont effacées, avec leurs photos
function purgerTaches_() {
  var lim = Date.now() - TACHE_GARDE, s = onglet_(ONGLET_TACHES), rows = lire_(ONGLET_TACHES);
  for (var i = rows.length - 1; i >= 0; i--) {
    var o = rows[i];
    if (String(o.etat) === 'fait' && temps_(o.fait_le) && temps_(o.fait_le) < lim) { jeterPhotos_(o); s.deleteRow(o._ligne); }
  }
}
function ajouterPhotoTache(code, id, dataUrl) {
  verifier_(code);
  var m = /^data:(image\/(?:jpeg|png));base64,(.+)$/.exec(String(dataUrl || ''));
  if (!m) throw new Error('Format de photo non pris en charge : choisis une photo JPEG ou PNG.');
  if (m[2].length > 2500000) throw new Error('Format de photo non pris en charge : photo trop lourde.');
  return verrou_(function () {
    var o = tache_(id), liste = photos_(o);
    if (liste.length >= TACHE_PHOTOS_MAX) throw new Error('Format de photo : ' + TACHE_PHOTOS_MAX + ' photos au maximum par note.');
    var blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], 'tache-' + o.id + '-' + Date.now() + '.jpg');
    var fichier = DriveApp.getFolderById(reglage_('dossier_photos')).createFile(blob);
    fichier.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    liste.push(fichier.getId());
    onglet_(ONGLET_TACHES).getRange(o._ligne, colPhotosTache_()).setValue(liste.join(','));
    return donnees(code);
  });
}
function retirerPhotoTache(code, id, photoId) {
  verifier_(code);
  return verrou_(function () {
    var o = tache_(id), liste = photos_(o).filter(function (p) { return p !== photoId; });
    onglet_(ONGLET_TACHES).getRange(o._ligne, colPhotosTache_()).setValue(liste.join(','));
    try { DriveApp.getFileById(photoId).setTrashed(true); } catch (e) {}
    return donnees(code);
  });
}

// ---------- Avalanches observées : contour dessiné sur la carte, mesures, fiche. Gardées 400 jours. ----------
var ONGLET_AVAL = 'Avalanches', COL_AVAL = ['id', 'date', 'par', 'json', 'photos', 'maj_le'], AVAL_VIE = 400 * 864e5;
function ongletAval_() {
  var c = classeur_(), s = c.getSheetByName(ONGLET_AVAL);
  if (!s) { s = c.insertSheet(ONGLET_AVAL); s.getRange(1, 1, 1, COL_AVAL.length).setValues([COL_AVAL]); s.setFrozenRows(1); }
  return s;
}
function avalanches_() {
  if (!classeur_().getSheetByName(ONGLET_AVAL)) return [];
  var lim = Date.now() - AVAL_VIE;
  return lire_(ONGLET_AVAL).map(function (o) {
    var a = null; try { a = JSON.parse(String(o.json || '')); } catch (e) {}
    if (!a) return null;
    a.id = String(o.id); a.at = Number(o.date) || a.at || 0; a.by = String(o.par || ''); a.photos = photos_(o);
    return a;
  }).filter(function (a) { return a && a.at > lim; }).sort(function (a, b) { return b.at - a.at; });
}
function aval_(id) {
  var o = lire_(ONGLET_AVAL).filter(function (x) { return String(x.id) === String(id); })[0];
  if (!o) throw new Error('Avalanche introuvable. Elle a peut-être été supprimée : recharge la page.');
  return o;
}
function enregistrerAvalanche(code, av, par) {
  verifier_(code);
  av = av || {};
  var id = String(av.id || '').replace(/[^A-Za-z0-9_-]/g, '');
  if (!/^a[a-z0-9]{4,24}$/.test(id)) throw new Error('Avalanche sans identifiant.');
  if (!av.poly || av.poly.length < 3) throw new Error("Dessine le contour de l'avalanche.");
  var garde = { at: Number(av.at) || Date.now(), poly: av.poly.slice(0, 400).map(function (p) { return [Math.round(Number(p[0]) * 1e6) / 1e6, Math.round(Number(p[1]) * 1e6) / 1e6]; }), m: av.m || {}, f: av.f || {} };
  var json = JSON.stringify(garde); if (json.length > 45000) throw new Error('Contour trop long.');
  return verrou_(function () {
    var s = ongletAval_(), ligne = 0;
    lire_(ONGLET_AVAL).forEach(function (o) { if (String(o.id) === id) ligne = o._ligne; });
    if (ligne) { s.getRange(ligne, 2, 1, 3).setValues([[garde.at, String(par || '').slice(0, 60), json]]); s.getRange(ligne, 6).setValue(Date.now()); }
    else s.appendRow([id, garde.at, String(par || '').slice(0, 60), json, '', Date.now()]);
    return { avalanches: avalanches_() };
  });
}
function supprimerAvalanche(code, id) {
  verifier_(code);
  return verrou_(function () {
    var s = ongletAval_();
    lire_(ONGLET_AVAL).reverse().forEach(function (o) { if (String(o.id) === String(id)) { jeterPhotos_(o); s.deleteRow(o._ligne); } });
    return { avalanches: avalanches_() };
  });
}
function ajouterPhotoAvalanche(code, id, dataUrl) {
  verifier_(code);
  var m = /^data:(image\/(?:jpeg|png));base64,(.+)$/.exec(String(dataUrl || ''));
  if (!m) throw new Error('Format de photo non pris en charge : choisis une photo JPEG ou PNG.');
  return verrou_(function () {
    var o = aval_(id), liste = photos_(o);
    if (liste.length >= 4) throw new Error('Format de photo : 4 photos au maximum par avalanche.');
    var blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], 'avalanche-' + o.id + '-' + Date.now() + '.jpg');
    var fichier = DriveApp.getFolderById(reglage_('dossier_photos')).createFile(blob);
    fichier.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    liste.push(fichier.getId());
    ongletAval_().getRange(o._ligne, 5).setValue(liste.join(','));
    return { avalanches: avalanches_() };
  });
}
function retirerPhotoAvalanche(code, id, photoId) {
  verifier_(code);
  return verrou_(function () {
    var o = aval_(id), liste = photos_(o).filter(function (p) { return p !== photoId; });
    ongletAval_().getRange(o._ligne, 5).setValue(liste.join(','));
    try { DriveApp.getFileById(photoId).setTrashed(true); } catch (e) {}
    return { avalanches: avalanches_() };
  });
}

// ---------- RECCO : contenu du classeur de formation R9 (classement RECCO « interne » : servi seulement avec le code de l'équipe) ----------
var ONGLET_RECCO = 'RECCO', COL_RECCO = ['id', 'type', 'date', 'par', 'json', 'maj_le'];
function ongletRecco_() {
  var c = classeur_(), s = c.getSheetByName(ONGLET_RECCO);
  if (!s) { s = c.insertSheet(ONGLET_RECCO); s.getRange(1, 1, 1, COL_RECCO.length).setValues([COL_RECCO]); s.setFrozenRows(1); }
  return s;
}
function recco_() {
  if (!classeur_().getSheetByName(ONGLET_RECCO)) return [];
  var lim = Date.now() - 800 * 864e5;
  return lire_(ONGLET_RECCO).map(function (o) {
    var j = null; try { j = JSON.parse(String(o.json || '')); } catch (e) {}
    if (!j) return null;
    return { id: String(o.id), type: String(o.type), at: Number(o.date) || 0, by: String(o.par || ''), d: j };
  }).filter(function (r) { return r && r.at > lim; }).sort(function (a, b) { return b.at - a.at; });
}
function enregistrerRecco(code, r, par) {
  verifier_(code);
  r = r || {};
  var id = String(r.id || '').replace(/[^A-Za-z0-9_-]/g, ''), type = r.type === 'ctl' ? 'ctl' : 'ex';
  if (!/^r[a-z0-9]{4,24}$/.test(id)) throw new Error('Fiche RECCO sans identifiant.');
  var json = JSON.stringify(r.d || {}); if (json.length > 20000) throw new Error('Fiche RECCO trop longue.');
  var at = Number(r.at) || Date.now();
  return verrou_(function () {
    var s = ongletRecco_(), ligne = 0;
    lire_(ONGLET_RECCO).forEach(function (o) { if (String(o.id) === id) ligne = o._ligne; });
    if (ligne) { s.getRange(ligne, 2, 1, 4).setValues([[type, at, String(par || '').slice(0, 60), json]]); s.getRange(ligne, 6).setValue(Date.now()); }
    else s.appendRow([id, type, at, String(par || '').slice(0, 60), json, Date.now()]);
    return { recco: recco_() };
  });
}
function supprimerRecco(code, id) {
  verifier_(code);
  return verrou_(function () {
    var s = ongletRecco_();
    lire_(ONGLET_RECCO).reverse().forEach(function (o) { if (String(o.id) === String(id)) s.deleteRow(o._ligne); });
    return { recco: recco_() };
  });
}

// ---------- La bible du patrouilleur : les 2 PDF rangés dans le Drive (dossier des photos), ouverts seulement avec le code de l'équipe ----------
// À la 1re ouverture, le script les copie une fois depuis l'ancienne version de l'appli, puis garde leurs identifiants.
var BIBLE_SRC = 'https://raw.githubusercontent.com/patrouilleurglacier3000/patrouilleurglacier3000.github.io/tmp-recco/';
var BIBLE_FICHIERS = ['L-essentiel-des-directives-Patrouilleurs.pdf', 'Le-saviez-vous-Jurisprudence-Patrouilleurs.pdf',
  'RECCO-Classeur-formation-R9.pdf', 'RECCO-Fiche-controle-detecteurs.pdf', 'RECCO-Fiche-suivi-equipe.pdf', 'Bible-texte.json'];
// Changer ce numéro quand un PDF est mis à jour : les anciens partent à la corbeille et les nouveaux arrivent tout seuls
var BIBLE_VERSION = 'v2.4-2026-11-14';
function bible_() {
  var pr = PropertiesService.getScriptProperties(), ids = {};
  try { ids = JSON.parse(pr.getProperty('bible_ids') || '{}'); } catch (e) {}
  if (pr.getProperty('bible_version') !== BIBLE_VERSION) {
    try {
      verrou_(function () {
        if (pr.getProperty('bible_version') === BIBLE_VERSION) return;
        var old = {}; try { old = JSON.parse(pr.getProperty('bible_ids') || '{}'); } catch (e) {}
        Object.keys(old).forEach(function (f) { try { DriveApp.getFileById(old[f]).setTrashed(true); } catch (e) {} });
        pr.setProperty('bible_ids', '{}'); pr.setProperty('bible_version', BIBLE_VERSION);
      });
    } catch (e) {}
    ids = {}; try { ids = JSON.parse(pr.getProperty('bible_ids') || '{}'); } catch (e) {}
  }
  var manque = BIBLE_FICHIERS.filter(function (f) { return !ids[f]; });
  if (manque.length) {
    try {
      verrou_(function () {
        try { ids = JSON.parse(pr.getProperty('bible_ids') || '{}'); } catch (e) {}
        BIBLE_FICHIERS.forEach(function (f) {
          if (ids[f]) return;
          var r = UrlFetchApp.fetch(BIBLE_SRC + f, { muteHttpExceptions: true });
          if (r.getResponseCode() !== 200) return;
          var fi = DriveApp.getFolderById(reglage_('dossier_photos')).createFile(r.getBlob().setName(f));
          ids[f] = fi.getId();
        });
        pr.setProperty('bible_ids', JSON.stringify(ids));
      });
    } catch (e) {}
  }
  return BIBLE_FICHIERS.map(function (f) { return { f: f, id: ids[f] || '' }; });
}
// À lancer une fois depuis l'éditeur Apps Script (menu en haut : choisir « installerBible », puis ▶ Exécuter) : autorise et range les 2 PDF dans le Drive.
function installerBible() { var r = bible_(); Logger.log('Bible : ' + r.filter(function (x) { return x.id; }).length + ' PDF sur ' + BIBLE_FICHIERS.length); return r; }
// Tout installer d'un coup : la bible (2 PDF), les pages RECCO, et la mise à jour du panneau à 7 h
function installerTout() {
  installerBible();
  var ids = installerRecco();
  try { installerPanneau(); Logger.log('Panneau : mise à jour programmée à 7 h'); } catch (e) { Logger.log('Panneau : ' + e); }
  Logger.log('✓ Terminé. Pense à Déployer → Gérer les déploiements → ✏ → Nouvelle version.');
  return ids;
}

// ---------- RECCO : pages du classeur (images) rangées dans le Drive, servies seulement avec le code de l'équipe ----------
var RECCO_PAGES_SRC = 'https://raw.githubusercontent.com/patrouilleurglacier3000/patrouilleurglacier3000.github.io/tmp-recco/', RECCO_NB_PAGES = 28;
var RECCO_VERSION = 'v18-chargeur'; // changer ce numéro = installerRecco remplace toutes les pages
function reccoPages_() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('recco_pages') || '[]'); } catch (e) { return []; } }
// À lancer une fois depuis l'éditeur (choisir « installerRecco », puis ▶ Exécuter)
function installerRecco() {
  var pr = PropertiesService.getScriptProperties(), ids = reccoPages_(), dossier = DriveApp.getFolderById(reglage_('dossier_photos'));
  if (pr.getProperty('recco_version') !== RECCO_VERSION) { // nouvelle version du classeur : on jette les anciennes pages
    ids.forEach(function (id) { try { if (id) DriveApp.getFileById(id).setTrashed(true); } catch (e) {} });
    ids = []; pr.setProperty('recco_pages', '[]'); pr.setProperty('recco_version', RECCO_VERSION);
  }
  for (var i = 1; i <= RECCO_NB_PAGES; i++) {
    if (ids[i - 1]) continue;
    var nom = 'p-' + (i < 10 ? '0' : '') + i + '.jpg', r = UrlFetchApp.fetch(RECCO_PAGES_SRC + nom, { muteHttpExceptions: true });
    if (r.getResponseCode() !== 200) { Logger.log('Page ' + i + ' introuvable'); continue; }
    var f = dossier.createFile(r.getBlob().setName('RECCO-classeur-' + nom));
    f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    ids[i - 1] = f.getId(); pr.setProperty('recco_pages', JSON.stringify(ids));
  }
  Logger.log(ids.filter(Boolean).length + ' pages installées sur ' + RECCO_NB_PAGES);
  return ids;
}

// ---------- Panneau d'information du Scex Rouge : une ligne par jour, mise à jour automatique à 7 h ----------
var ONGLET_PANNEAU = 'Panneau', COL_PANNEAU = ['jour', 'json', 'maj_le'], METEO_G3000 = 'https://www.glacier3000.ch/en/weather/';
function jourCH_(t) { return Utilities.formatDate(new Date(t || Date.now()), 'Europe/Zurich', 'yyyy-MM-dd'); }
function ongletPanneau_() {
  var c = classeur_(), s = c.getSheetByName(ONGLET_PANNEAU);
  if (!s) { s = c.insertSheet(ONGLET_PANNEAU); s.getRange(1, 1, 1, COL_PANNEAU.length).setValues([COL_PANNEAU]); s.setFrozenRows(1); s.getRange('A:A').setNumberFormat('@'); }
  return s;
}
function panneauLignes_() {
  if (!classeur_().getSheetByName(ONGLET_PANNEAU)) return [];
  return lire_(ONGLET_PANNEAU).map(function (o) { var j = null; try { j = JSON.parse(String(o.json || '')); } catch (e) {} return j ? { jour: String(o.jour), d: j, _ligne: o._ligne } : null; }).filter(Boolean).sort(function (a, b) { return a.jour < b.jour ? 1 : -1; });
}
// les 2 derniers jours suffisent à l'appli (aujourd'hui + la veille pour reprendre les pistes)
function panneau_() { return panneauLignes_().slice(0, 2).map(function (p) { return { jour: p.jour, d: p.d }; }); }
function ecrirePanneau_(jour, d) {
  var s = ongletPanneau_(), ligne = 0;
  panneauLignes_().forEach(function (p) { if (p.jour === jour) ligne = p._ligne; });
  var json = JSON.stringify(d); if (json.length > 45000) throw new Error('Dessin trop chargé : efface quelques traits.');
  if (ligne) s.getRange(ligne, 2, 1, 2).setValues([[json, Date.now()]]);
  else s.appendRow([jour, json, Date.now()]);
}
// Lit la page météo de glacier3000.ch (température, vent, danger d'avalanche)
function meteoG3000_() {
  var r = UrlFetchApp.fetch(METEO_G3000, { muteHttpExceptions: true, followRedirects: true });
  if (r.getResponseCode() !== 200) return null;
  var t = r.getContentText().replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ');
  var m = {}, x;
  x = /(-?\d+(?:[.,]\d+)?)\s*°\s*C/.exec(t); if (x) m.temp = Math.round(parseFloat(x[1].replace(',', '.')) * 10) / 10;
  x = /wind[^0-9-]{0,40}(\d+(?:[.,]\d+)?)\s*km\s*\/\s*h/i.exec(t); if (x) m.vent = Math.round(parseFloat(x[1].replace(',', '.')));
  x = /gust[^0-9-]{0,40}(\d+(?:[.,]\d+)?)\s*km\s*\/\s*h/i.exec(t); if (x) m.rafale = Math.round(parseFloat(x[1].replace(',', '.')));
  x = /avalanche[^0-9]{0,60}(\d)\s*\/\s*5/i.exec(t); if (x) m.aval = +x[1];
  x = /new snow[^0-9-]{0,20}(\d+)\s*cm/i.exec(t); if (x) m.neige = +x[1];
  m.at = Date.now();
  return m.temp != null || m.aval != null ? m : null;
}
// Tous les matins à 7 h : crée la fiche du jour (pistes et message repris de la veille) avec la météo du moment
function panneauMatin() {
  return; // panneau d'information retiré de l'appli (13.11.2026) : le déclencheur de 7 h ne fait plus rien
  var jour = jourCH_(), L = panneauLignes_(), auj = L.filter(function (p) { return p.jour === jour; })[0], veille = L.filter(function (p) { return p.jour < jour; })[0];
  var d = auj ? auj.d : { pistes: veille ? veille.d.pistes || {} : {}, liste: veille ? veille.d.liste : null, msg: veille ? veille.d.msg || '' : '', draw: [], repris: !!veille };
  var m = null; try { m = meteoG3000_(); } catch (e) {}
  if (m) { d.auto = m; ['temp', 'vent', 'aval'].forEach(function (k) { if (m[k] != null && !(d.manuel && d.manuel[k])) d[k] = m[k]; }); }
  verrou_(function () { ecrirePanneau_(jour, d); });
  return d;
}
function enregistrerPanneau(code, jour, d) {
  verifier_(code);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(jour))) throw new Error('Date du panneau invalide.');
  return verrou_(function () { ecrirePanneau_(String(jour), d || {}); return { panneau: panneau_() }; });
}
function meteoPanneau(code) { verifier_(code); var m = meteoG3000_(); if (!m) throw new Error('Météo de glacier3000.ch illisible pour le moment.'); return { meteo: m }; }
// À lancer une fois depuis l'éditeur : programme la mise à jour tous les jours à 7 h (heure suisse)
function installerPanneau() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'panneauMatin') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('panneauMatin').timeBased().atHour(7).nearMinute(0).everyDays(1).inTimezone('Europe/Zurich').create();
  var d = panneauMatin(); Logger.log('Panneau programmé à 7 h. Météo lue : ' + JSON.stringify(d.auto || null)); return d;
}
// Envoie un PDF de la bible à l'appli (seulement avec le code de l'équipe) : l'appli l'affiche elle-même, sans passer par un compte Google
function bibleFichier(code, f) {
  verifier_(code);
  var x = bible_().filter(function (b) { return b.f === f && b.id; })[0];
  if (!x) throw new Error('Document pas encore installé : lance « installerTout » dans le script.');
  return { f: f, b64: Utilities.base64Encode(DriveApp.getFileById(x.id).getBlob().getBytes()) };
}

/* ------------------------------------------------------------ Assistant IA (Claude) */
// La clé API reste dans les propriétés du script : jamais dans le code, jamais renvoyée à l'appli.
var IA_MODELE = 'claude-haiku-5-5', IA_URL = 'https://api.anthropic.com/v1/messages';
function iaCle_() { return PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY') || ''; }
function enregistrerCleIA(code, cle) {
  verifier_(code);
  cle = String(cle || '').trim();
  if (!/^sk-ant-[A-Za-z0-9_\-]{20,}$/.test(cle)) throw new Error("Ce n'est pas une clé valide (elle commence par sk-ant-).");
  PropertiesService.getScriptProperties().setProperty('ANTHROPIC_API_KEY', cle);
  return { ok: true };
}
function etatIA(code) { verifier_(code); return { pret: !!iaCle_() }; }
function iaNorm_(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
var IA_VIDES = ' le la les un une des de du au aux et ou a en sur dans pour par avec est il elle on je tu nous vous ils que qui quoi ce cet cette ces se sa son ses mon ma mes ton ta tes y a t pas ne plus encore reste restent combien quel quelle quels quelles est ce que il y '.split(' ').reduce(function (o, w) { if (w) o[w] = 1; return o; }, {});
function iaMots_(t) { return iaNorm_(t).split(' ').filter(function (w) { return w.length > 1 && !IA_VIDES[w]; }); }

// --- outils ---
function iaStock_(texte) {
  var lieux = listeLieux_().map(function (l) { return l.name; }), q = quantites_(), mots = iaMots_(texte);
  var arts = lire_(ONGLET_STOCK).map(function (o) {
    var id = String(o.id), nom = String(o.nom), n = iaNorm_(nom + ' ' + o.categorie), sc = 0;
    mots.forEach(function (w) { var r = w.replace(/s$/, ''); if (n.indexOf(r) >= 0) sc += 2; });
    var par = {}; lieux.forEach(function (l) { var v = q[id] && q[id][l] ? q[id][l].n : 0; if (v) par[l] = v; });
    return { id: id, nom: nom, categorie: String(o.categorie), par_lieu: par, sc: sc };
  });
  var bons = arts.filter(function (a) { return a.sc > 0; }).sort(function (a, b) { return b.sc - a.sc; }).slice(0, 12);
  if (!bons.length) bons = arts.slice(0, 40);
  return { lieux: lieux, articles: bons.map(function (a) { delete a.sc; return a; }) };
}
function iaMouvement_(id, lieu, delta, prenom) {
  return verrou_(function () {
    var a = article_(id), L = lieuValide_(lieu).name, q = quantites_();
    var avant = q[a.id] && q[a.id][L] ? q[a.id][L].n : 0, apres = Math.max(0, avant + Math.round(nombre_(delta)));
    ecrireQte_(q, String(a.id), L, apres); majTotal_(q, a); noterMouvement_(a, apres - avant, 'Assistant' + (prenom ? ' · ' + prenom : ''), L);
    return { fait: String(a.nom) + ' · ' + L + ' : ' + avant + ' → ' + apres, annuler: { t: 'mvt', id: String(a.id), lieu: L, delta: avant - apres } };
  });
}
function iaCommande_(de, vers, lignes, note) {
  var arts = lire_(ONGLET_STOCK), propres = (lignes || []).map(function (l) {
    var a = arts.filter(function (o) { return String(o.id) === String(l.article_id); })[0];
    return a ? { id: String(a.id), name: String(a.nom).slice(0, 60), qty: Math.max(1, Math.round(nombre_(l.quantite))) } : null;
  }).filter(Boolean);
  if (!propres.length) throw new Error('Aucun article reconnu pour la commande.');
  var cible = (vers === 'pistes' || vers === VERS_PISTE) ? VERS_PISTE : vers;
  var id = 'c' + Date.now().toString(36);
  verrou_(function () {
    lieuValide_(de); if (cible !== VERS_PISTE) lieuValide_(cible);
    if (cible === de) throw new Error('Départ et arrivée identiques.');
    onglet_(ONGLET_CMD).appendRow([id, de, cible, String(note || '').trim().slice(0, 120), JSON.stringify(propres), 'a_monter', new Date(), '', '']);
  });
  return { fait: 'Commande : ' + propres.map(function (p) { return p.qty + ' × ' + p.name; }).join(', ') + ' · ' + de + ' → ' + (cible === VERS_PISTE ? 'pistes' : cible), annuler: { t: 'cmd', id: id } };
}
function iaTache_(texte, zone, prio, prenom) {
  var id = 't' + Date.now().toString(36), zones = zones_();
  var z = zones.filter(function (x) { return iaNorm_(x) === iaNorm_(zone); })[0] || 'Tableau';
  var p = PRIOS.indexOf(prio) >= 0 ? prio : 'normal';
  texte = String(texte || '').trim().slice(0, 300); if (!texte) throw new Error('Tâche vide.');
  verrou_(function () { onglet_(ONGLET_TACHES).appendRow([id, texte, z, p, 'afaire', '', '', '', String(prenom || 'Assistant').slice(0, 30), Date.now(), '', Date.now()]); });
  return { fait: 'Tâche' + (p === 'urgent' ? ' urgente' : '') + ' : ' + texte + ' (' + z + ')', annuler: { t: 'tache', id: id } };
}
function iaEvenement_(e) {
  var titre = String(e.titre || '').trim().slice(0, 80), date = txtDate_(e.date);
  if (!titre || !date) throw new Error('Il manque le titre ou le jour.');
  var cat = CATS_PLAN.indexOf(e.categorie) >= 0 ? e.categorie : 'autre', id = 'e' + Date.now().toString(36);
  verrou_(function () { onglet_(ONGLET_PLAN).appendRow([id, date, txtHeure_(e.debut), txtHeure_(e.fin), titre, cat, 'non', String(e.qui || '').slice(0, 80), String(e.note || '').slice(0, 300), new Date()]); });
  return { fait: 'Agenda : ' + titre + ' · ' + date + (e.debut ? ' ' + txtHeure_(e.debut) : ''), annuler: { t: 'evt', id: id } };
}
function iaBibleTexte_() {
  var c = CacheService.getScriptCache(), k = 'bible_txt_' + BIBLE_VERSION, v = c.get(k);
  if (v) { try { return JSON.parse(v); } catch (e) {} }
  var ids = json_(PropertiesService.getScriptProperties().getProperty('bible_ids'), {}), id = ids['Bible-texte.json'];
  if (!id) { bible_(); ids = json_(PropertiesService.getScriptProperties().getProperty('bible_ids'), {}); id = ids['Bible-texte.json']; }
  if (!id) return [];
  var t = DriveApp.getFileById(id).getBlob().getDataAsString('UTF-8'), j = json_(t, []);
  try { if (t.length < 95000) c.put(k, t, 21600); } catch (e) {}
  return j;
}
function iaBible_(question) {
  var mots = iaMots_(question).map(function (w) { return w.length > 4 ? w.slice(0, w.length - 1) : w; }), ch = iaBibleTexte_();
  var docs = ch.map(function (c) { return { c: c, n: iaNorm_(c.texte), ti: iaNorm_(c.titre) }; }), N = docs.length || 1;
  var idf = mots.map(function (w) { var df = docs.filter(function (d) { return d.n.indexOf(w) >= 0; }).length; return Math.log((N + 1) / (df + 1)); });
  var r = docs.map(function (d) {
    var sc = 0;
    mots.forEach(function (w, k) { var tf = d.n.split(w).length - 1; if (tf) sc += idf[k] * (1 + Math.log(tf)); if (d.ti.indexOf(w) >= 0) sc += idf[k]; });
    return { c: d.c, sc: sc };
  }).filter(function (x) { return x.sc > 0; }).sort(function (a, b) { return b.sc - a.sc; });
  // 3 extraits des directives + 2 de la jurisprudence, les meilleurs de chaque
  var ess = r.filter(function (x) { return /essentiel/i.test(x.c.doc); }).slice(0, 3), jur = r.filter(function (x) { return !/essentiel/i.test(x.c.doc); }).slice(0, 2);
  r = ess.concat(jur);
  return { extraits: r.map(function (x) { return { document: x.c.doc, page: x.c.page, titre: x.c.titre, texte: x.c.texte.slice(0, 1800) }; }) };
}

var IA_OUTILS = [
  { name: 'chercher_stock', description: "Cherche des articles du stock (nom, catégorie) et donne les quantités par lieu. Toujours l'utiliser avant une action sur le stock ou une commande.", input_schema: { type: 'object', properties: { texte: { type: 'string', description: "Ce qu'on cherche, ex. « filet », « jalons gauche »" } }, required: ['texte'] } },
  { name: 'mouvement_stock', description: "Change la quantité d'un article dans un lieu. delta négatif = matériel pris/sorti, positif = rangé/ramené. Seulement si l'article et le lieu sont sûrs.", input_schema: { type: 'object', properties: { article_id: { type: 'string' }, lieu: { type: 'string' }, delta: { type: 'integer' } }, required: ['article_id', 'lieu', 'delta'] } },
  { name: 'creer_commande', description: "Commande de matériel à faire monter d'un lieu vers un autre lieu, ou vers « pistes ».", input_schema: { type: 'object', properties: { de: { type: 'string' }, vers: { type: 'string' }, lignes: { type: 'array', items: { type: 'object', properties: { article_id: { type: 'string' }, quantite: { type: 'integer' } }, required: ['article_id', 'quantite'] } }, note: { type: 'string' } }, required: ['de', 'vers', 'lignes'] } },
  { name: 'ajouter_tache', description: "Ajoute une tâche pour l'équipe.", input_schema: { type: 'object', properties: { texte: { type: 'string' }, zone: { type: 'string' }, priorite: { type: 'string', enum: ['urgent', 'normal', 'tard', 'attention'] } }, required: ['texte'] } },
  { name: 'ajouter_agenda', description: "Ajoute un événement à l'agenda. date au format AAAA-MM-JJ, heures HH:MM.", input_schema: { type: 'object', properties: { titre: { type: 'string' }, date: { type: 'string' }, debut: { type: 'string' }, fin: { type: 'string' }, categorie: { type: 'string', enum: CATS_PLAN }, qui: { type: 'string' }, note: { type: 'string' } }, required: ['titre', 'date'] } },
  { name: 'chercher_bible', description: "Cherche dans nos documents (L'essentiel des directives SKUS/RMS et Le saviez-vous, jurisprudence). À utiliser pour toute question sur les règles, les obligations, ce qui est autorisé, les signaux, les jugements.", input_schema: { type: 'object', properties: { question: { type: 'string' } }, required: ['question'] } }
];
function iaSysteme_(prenom) {
  var tz = Session.getScriptTimeZone(), now = new Date();
  var jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  return "Tu t'appelles Vigo (la mascotte est un chien d'avalanche). Tu es l'assistant des patrouilleurs du domaine skiable de Glacier 3000. Tu parles à " + (prenom || 'un patrouilleur') + ", sur le terrain, souvent avec des gants.\n" +
    "Aujourd'hui : " + jours[now.getDay()] + ' ' + Utilities.formatDate(now, tz, 'yyyy-MM-dd HH:mm') + ".\n" +
    "Lieux de stock : " + listeLieux_().map(function (l) { return l.name; }).join(', ') + ".\nZones des tâches : " + zones_().join(', ') + ".\n" +
    "Règles :\n- Réponds en français, très court (1 à 3 phrases), sans politesse inutile ni explication. Pas de markdown.\n" +
    "- Stock : cherche d'abord avec chercher_stock. Si l'article ou le lieu est ambigu, pose UNE question courte au lieu d'agir. « J'ai pris » = delta négatif, « j'ai ramené / rangé » = delta positif.\n" +
    "- Commande : « je veux / fais monter X qui est à tel endroit » = creer_commande du lieu où il est vers le lieu demandé (demande la destination si elle manque).\n" +
    "- Après une action, confirme en une phrase ce qui a été fait.\n" +
    "- Règles, directives, ce qui est autorisé, jugements : utilise chercher_bible et réponds UNIQUEMENT avec les extraits trouvés, en citant (document, page). Si les extraits ne répondent pas : « Ce n'est pas dans nos documents. » N'invente jamais une règle.\n" +
    "- Pas de conseil médical ni de bilan victime.";
}
function iaAppel_(cle, sys, msgs) {
  var r = UrlFetchApp.fetch(IA_URL, { method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { 'x-api-key': cle, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({ model: IA_MODELE, max_tokens: 700, system: sys, tools: IA_OUTILS, messages: msgs }) });
  var c = r.getResponseCode(), j = json_(r.getContentText(), {});
  if (c === 400 && /credit/i.test(r.getContentText())) throw new Error("Plus de crédit IA : recharge le compte sur platform.claude.com.");
  if (c === 401) throw new Error("La clé IA n'est pas valide.");
  if (c === 429) throw new Error("Limite IA atteinte (dépense ou trop de demandes). Réessaie plus tard.");
  if (c >= 300) throw new Error('IA indisponible (' + c + ').');
  return j;
}
// messages = [{role:'user'|'assistant', text:'…'}] (la conversation visible)
function assistant(code, messages, prenom, page) {
  verifier_(code);
  var cle = iaCle_(); if (!cle) throw new Error("L'assistant n'est pas encore branché : il manque la clé IA.");
  var msgs = (messages || []).slice(-12).map(function (m) { return { role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.text || '').slice(0, 2000) }; })
    .filter(function (m) { return m.content; });
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  if (!msgs.length) throw new Error('Rien à envoyer.');
  var sys = iaSysteme_(prenom) + (page ? "\nIl a ouvert l'assistant depuis la page : " + String(page).slice(0, 30) + " (c'est sans doute le sujet, sauf s'il dit autre chose)." : ''), actions = [], use = { in: 0, out: 0 }, texte = '';
  for (var tour = 0; tour < 6; tour++) {
    var r = iaAppel_(cle, sys, msgs);
    if (r.usage) { use.in += r.usage.input_tokens || 0; use.out += r.usage.output_tokens || 0; }
    var blocs = r.content || [], outils = blocs.filter(function (b) { return b.type === 'tool_use'; });
    texte = blocs.filter(function (b) { return b.type === 'text'; }).map(function (b) { return b.text; }).join(' ').trim();
    if (!outils.length || r.stop_reason !== 'tool_use') break;
    msgs.push({ role: 'assistant', content: blocs });
    msgs.push({ role: 'user', content: outils.map(function (o) {
      var res, err = false, x = o.input || {};
      try {
        if (o.name === 'chercher_stock') res = iaStock_(x.texte);
        else if (o.name === 'mouvement_stock') { res = iaMouvement_(x.article_id, x.lieu, x.delta, prenom); actions.push(res); }
        else if (o.name === 'creer_commande') { res = iaCommande_(x.de, x.vers, x.lignes, x.note); actions.push(res); }
        else if (o.name === 'ajouter_tache') { res = iaTache_(x.texte, x.zone, x.priorite, prenom); actions.push(res); }
        else if (o.name === 'ajouter_agenda') { res = iaEvenement_(x); actions.push(res); }
        else if (o.name === 'chercher_bible') res = iaBible_(x.question);
        else { res = { erreur: 'outil inconnu' }; err = true; }
      } catch (e) { res = { erreur: String(e.message || e) }; err = true; }
      return { type: 'tool_result', tool_use_id: o.id, content: JSON.stringify(res), is_error: err };
    }) });
  }
  var P = PropertiesService.getScriptProperties(), tot = json_(P.getProperty('ia_tokens'), { in: 0, out: 0, n: 0 });
  tot.in += use.in; tot.out += use.out; tot.n += 1; P.setProperty('ia_tokens', JSON.stringify(tot));
  return { texte: texte || (actions.length ? 'Fait.' : '…'), actions: actions.map(function (a) { return { fait: a.fait, annuler: a.annuler }; }), usage: use, total: tot };
}
function annulerAssistant(code, a) {
  verifier_(code); a = a || {};
  if (a.t === 'mvt') iaMouvement_(a.id, a.lieu, a.delta, 'annulation');
  else if (a.t === 'cmd') verrou_(function () { var o = lire_(ONGLET_CMD).filter(function (x) { return String(x.id) === String(a.id); })[0]; if (o) onglet_(ONGLET_CMD).deleteRow(o._ligne); });
  else if (a.t === 'tache') verrou_(function () { var o = lire_(ONGLET_TACHES).filter(function (x) { return String(x.id) === String(a.id); })[0]; if (o) onglet_(ONGLET_TACHES).deleteRow(o._ligne); });
  else if (a.t === 'evt') verrou_(function () { var o = lire_(ONGLET_PLAN).filter(function (x) { return String(x.id) === String(a.id); })[0]; if (o) onglet_(ONGLET_PLAN).deleteRow(o._ligne); });
  return { ok: true };
}

// ---------- Photos horodatées par le serveur (Suivi des pentes + Preuves) ----------
// L'heure est celle du serveur Google (le téléphone ne peut pas la changer). Chaque photo reçoit son empreinte SHA-256 :
// le fichier original n'est jamais modifié, si un seul pixel change, l'empreinte ne correspond plus.
function hex_(octets) { return octets.map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join(''); }
function sha256_(x) { return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, x)); }
function lireCols_(nom, n) {
  var s = classeur_().getSheetByName(nom); if (!s || s.getLastRow() < 2) return [];
  var v = s.getRange(1, 1, s.getLastRow(), n).getValues(), entete = v.shift(), out = [];
  v.forEach(function (r, i) { if (r[0] === '' || r[0] === null) return; var o = { _ligne: i + 2 }; entete.forEach(function (k, j) { o[k] = r[j]; }); out.push(o); });
  return out;
}
function ongletCree_(nom, cols, proteger) {
  var c = classeur_(), s = c.getSheetByName(nom);
  if (!s) {
    s = c.insertSheet(nom); s.getRange(1, 1, 1, cols.length).setValues([cols]); s.setFrozenRows(1);
    s.getRange(1, 1, s.getMaxRows(), cols.length).setNumberFormat('@'); // texte brut : « 12/3 » reste « 12/3 », jamais une date
    if (proteger) { try { var p = s.protect().setDescription('Journal des preuves : ne pas modifier à la main'); p.setWarningOnly(true); } catch (e) {} }
  }
  return s;
}
function sousDossier_(cle, nom) {
  var pr = PropertiesService.getScriptProperties(), id = pr.getProperty(cle);
  if (id) { try { var d = DriveApp.getFolderById(id); if (!d.isTrashed()) return d; } catch (e) {} }
  var d2 = DriveApp.getFolderById(reglage_('dossier_photos')).createFolder(nom);
  pr.setProperty(cle, d2.getId()); return d2;
}
function image_(dataUrl, max) {
  var m = /^data:(image\/(?:jpeg|png));base64,(.+)$/.exec(String(dataUrl || ''));
  if (!m) throw new Error('Format de photo non pris en charge : choisis une photo JPEG ou PNG.');
  if (m[2].length > max) throw new Error('Format de photo : image trop lourde.');
  return { type: m[1], octets: Utilities.base64Decode(m[2]) };
}
function vignette_(u) { u = String(u || ''); return /^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(u) && u.length < 48000 ? u : ''; }
function coord_(x) { var n = Number(x); return isFinite(n) && n !== 0 ? Math.round(n * 1e6) / 1e6 : ''; }
function horo_(t) { return Utilities.formatDate(new Date(t), 'Europe/Zurich', 'yyyyMMdd-HHmmss'); }

// ----- Suivi des pentes : des points de vue fixes, une photo par jour, tout l'historique -----
var ONGLET_PENTES = 'Pentes', COL_PENTES = ['id', 'nom', 'lat', 'lng', 'cree_le', 'par', 'secteur', 'alt', 'cap', 'precision_m'];
function ongletPentes_() {
  var s = ongletCree_(ONGLET_PENTES, COL_PENTES);
  if (String(s.getRange(1, 10).getValue()) !== 'precision_m') s.getRange(1, 7, 1, 4).setValues([['secteur', 'alt', 'cap', 'precision_m']]);
  return s;
}
var ONGLET_PPH = 'Pentes photos', COL_PPH = ['id', 'spot', 'date', 'par', 'note', 'fichier', 'lat', 'lng', 'sha256', 'heure_tel', 'vignette', 'traits'];
function ongletPph_() {
  var s = ongletCree_(ONGLET_PPH, COL_PPH);
  if (String(s.getRange(1, 12).getValue()) !== 'traits') s.getRange(1, 12).setValue('traits');
  return s;
}
// Traits dessinés au doigt : [{i: id, p: [[x, y], …] entre 0 et 1, e: date de fin (facultatif)}]
function traits_(t) {
  var L = Array.isArray(t) ? t : json_(String(t || ''), []);
  if (!Array.isArray(L)) return [];
  var out = L.slice(0, 60).map(function (x) {
    var pts = (x && x.p || []).slice(0, 800).map(function (q) { return [Math.round(Math.min(1, Math.max(0, Number(q[0]) || 0)) * 1e4) / 1e4, Math.round(Math.min(1, Math.max(0, Number(q[1]) || 0)) * 1e4) / 1e4]; });
    var o = { i: String(x.i || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 16), p: pts }; if (Number(x.e)) o.e = Number(x.e); return o;
  }).filter(function (x) { return x.i && x.p.length > 1; });
  if (JSON.stringify(out).length > 45000) throw new Error('Dessin trop long : fais des traits plus courts.');
  return out;
}
function pentes_() {
  if (!classeur_().getSheetByName(ONGLET_PENTES)) return [];
  var ph = lireCols_(ONGLET_PPH, 10), par = {};
  ph.forEach(function (p) {
    var k = String(p.spot), o = par[k] || (par[k] = { n: 0, last: null });
    o.n++; if (!o.last || Number(p.date) > o.last.at) o.last = { id: String(p.id), at: Number(p.date), by: String(p.par || ''), note: String(p.note || ''), f: String(p.fichier || '') };
  });
  return lire_(ONGLET_PENTES).map(function (o) {
    var x = par[String(o.id)] || { n: 0, last: null };
    return { id: String(o.id), name: String(o.nom), sect: String(o.secteur || ''), lat: Number(o.lat) || null, lng: Number(o.lng) || null, alt: o.alt === '' || o.alt == null ? null : Number(o.alt), cap: o.cap === '' || o.cap == null ? null : Number(o.cap), acc: Number(o.precision_m) || null, at: Number(o.cree_le) || 0, n: x.n, last: x.last };
  });
}
function enregistrerPente(code, sp, par) {
  verifier_(code);
  sp = sp || {};
  var id = String(sp.id || '').replace(/[^A-Za-z0-9_-]/g, ''), nom = String(sp.name || '').trim().slice(0, 60);
  if (!/^s[a-z0-9]{4,24}$/.test(id)) throw new Error('Point de vue sans identifiant.');
  if (!nom) throw new Error('Écris le nom du point de vue.');
  return verrou_(function () {
    var s = ongletPentes_(), o = lire_(ONGLET_PENTES).filter(function (x) { return String(x.id) === id; })[0], sect = String(sp.sect || '').trim().slice(0, 40);
    if (o) {
      s.getRange(o._ligne, 2).setValue(nom);
      if (sp.sect != null) s.getRange(o._ligne, 7).setValue(sect);
      if (sp.lat && sp.lng) {
        s.getRange(o._ligne, 3, 1, 2).setValues([[coord_(sp.lat), coord_(sp.lng)]]);
        s.getRange(o._ligne, 8, 1, 3).setValues([[isFinite(Number(sp.alt)) && sp.alt !== null ? Math.round(Number(sp.alt)) : '', isFinite(Number(sp.cap)) && sp.cap !== null ? Math.round(Number(sp.cap)) % 360 : '', Math.round(Number(sp.acc)) || '']]);
      }
    } else s.appendRow([id, nom, coord_(sp.lat), coord_(sp.lng), Date.now(), String(par || '').slice(0, 60), sect, '', '', '']);
    ongletPph_();
    return { pentes: pentes_() };
  });
}
// Création en une fois d'une liste de points (secteur + nom) ; ceux qui existent déjà sont ignorés
function importerPentes(code, liste, par) {
  verifier_(code);
  return verrou_(function () {
    var s = ongletPentes_(), deja = {}, t = Date.now(), lignes = [];
    lire_(ONGLET_PENTES).forEach(function (o) { deja[String(o.secteur || '').toLowerCase() + '|' + String(o.nom).toLowerCase()] = 1; });
    (liste || []).slice(0, 200).forEach(function (x, i) {
      var sect = String(x.sect || '').trim().slice(0, 40), nom = String(x.name || '').trim().slice(0, 60), k = sect.toLowerCase() + '|' + nom.toLowerCase();
      if (!nom || deja[k]) return; deja[k] = 1;
      lignes.push(['s' + (t + i).toString(36) + Math.random().toString(36).slice(2, 5), nom, '', '', t + i, String(par || '').slice(0, 60), sect]);
    });
    if (lignes.length) s.getRange(s.getLastRow() + 1, 1, lignes.length, 7).setValues(lignes);
    ongletPph_();
    return { pentes: pentes_(), ajoutes: lignes.length };
  });
}
function supprimerPente(code, id) {
  verifier_(code);
  return verrou_(function () {
    var ph = classeur_().getSheetByName(ONGLET_PPH);
    if (ph) lireCols_(ONGLET_PPH, 10).reverse().forEach(function (p) {
      if (String(p.spot) !== String(id)) return;
      try { DriveApp.getFileById(String(p.fichier)).setTrashed(true); } catch (e) {}
      ph.deleteRow(p._ligne);
    });
    var s = classeur_().getSheetByName(ONGLET_PENTES);
    if (s) lire_(ONGLET_PENTES).reverse().forEach(function (o) { if (String(o.id) === String(id)) s.deleteRow(o._ligne); });
    return { pentes: pentes_() };
  });
}
function photoPente(code, spotId, dataUrl, vign, meta, par) {
  verifier_(code);
  meta = meta || {};
  var cid = /^q[a-z0-9]{6,24}$/.test(String(meta.cid || '')) ? String(meta.cid) : '';
  if (cid) { // envoi répété (réseau coupé après l'enregistrement) : on renvoie la photo déjà enregistrée
    var deja = historiqueLigne_(cid);
    if (deja) return { pentes: pentes_(), photo: deja };
  }
  var img = image_(dataUrl, 4e6), t = Date.now(), sha = sha256_(img.octets);
  var sp = lire_(ONGLET_PENTES).filter(function (x) { return String(x.id) === String(spotId); })[0];
  if (!sp) throw new Error('Point de vue introuvable. Il a peut-être été supprimé : recharge la page.');
  var nomF = 'pente-' + String(sp.nom).replace(/[^A-Za-z0-9]+/g, '-').slice(0, 30) + '-' + horo_(t) + '.jpg';
  var f = sousDossier_('dossier_pentes', 'Suivi des pentes').createFile(Utilities.newBlob(img.octets, img.type, nomF));
  f.setDescription('Suivi des pentes · ' + sp.nom + ' · ' + Utilities.formatDate(new Date(t), 'Europe/Zurich', 'dd.MM.yyyy HH:mm:ss') + ' (heure serveur) · SHA-256 ' + sha);
  var id = cid || 'q' + t.toString(36) + Math.random().toString(36).slice(2, 5), note = String(meta.note || '').slice(0, 300);
  return verrou_(function () {
    var tr = traits_(meta.traits);
    ongletPph_().appendRow([id, String(sp.id), t, String(par || '').slice(0, 60), note, f.getId(), coord_(meta.lat), coord_(meta.lng), sha, Number(meta.tel) || '', vignette_(vign), tr.length ? JSON.stringify(tr) : '']);
    return { pentes: pentes_(), photo: { id: id, at: t, by: String(par || ''), note: note, f: f.getId(), sha: sha, thumb: vignette_(vign), traits: tr } };
  });
}
function historiqueLigne_(id) {
  if (!classeur_().getSheetByName(ONGLET_PPH)) return null;
  var p = lire_(ONGLET_PPH).filter(function (x) { return String(x.id) === String(id); })[0];
  return p ? { id: String(p.id), at: Number(p.date), by: String(p.par || ''), note: String(p.note || ''), f: String(p.fichier), sha: String(p.sha256 || ''), thumb: String(p.vignette || ''), traits: traits_(p.traits) } : null;
}
function historiquePente(code, spotId) {
  verifier_(code);
  return lire_(ONGLET_PPH).filter(function (p) { return String(p.spot) === String(spotId); }).map(function (p) {
    return { id: String(p.id), at: Number(p.date), by: String(p.par || ''), note: String(p.note || ''), f: String(p.fichier), lat: Number(p.lat) || null, lng: Number(p.lng) || null, sha: String(p.sha256 || ''), thumb: String(p.vignette || ''), traits: traits_(p.traits) };
  }).sort(function (a, b) { return b.at - a.at; });
}
function vignettesPentes(code) {
  verifier_(code);
  if (!classeur_().getSheetByName(ONGLET_PPH)) return {};
  var best = {};
  lire_(ONGLET_PPH).forEach(function (p) { var k = String(p.spot); if (!best[k] || Number(p.date) > best[k].at) best[k] = { at: Number(p.date), thumb: String(p.vignette || '') }; });
  var out = {}; Object.keys(best).forEach(function (k) { out[k] = best[k].thumb; }); return out;
}
function notePente(code, photoId, note) {
  verifier_(code);
  return verrou_(function () {
    var p = lireCols_(ONGLET_PPH, 5).filter(function (x) { return String(x.id) === String(photoId); })[0];
    if (!p) throw new Error('Photo introuvable. Elle a peut-être été supprimée : recharge la page.');
    onglet_(ONGLET_PPH).getRange(p._ligne, 5).setValue(String(note || '').slice(0, 300));
    return { pentes: pentes_() };
  });
}
function traitsPente(code, photoId, traits) {
  verifier_(code);
  var tr = traits_(traits);
  return verrou_(function () {
    var p = lireCols_(ONGLET_PPH, 2).filter(function (x) { return String(x.id) === String(photoId); })[0];
    if (!p) throw new Error('Photo introuvable. Elle a peut-être été supprimée : recharge la page.');
    ongletPph_().getRange(p._ligne, 12).setValue(tr.length ? JSON.stringify(tr) : '');
    return { traits: tr };
  });
}
function supprimerPhotoPente(code, photoId) {
  verifier_(code);
  return verrou_(function () {
    lireCols_(ONGLET_PPH, 6).reverse().forEach(function (p) {
      if (String(p.id) !== String(photoId)) return;
      try { DriveApp.getFileById(String(p.fichier)).setTrashed(true); } catch (e) {}
      onglet_(ONGLET_PPH).deleteRow(p._ligne);
    });
    return { pentes: pentes_() };
  });
}

// ----- Preuves : journal en ajout seul, chaque ligne est liée à la précédente (chaîne d'empreintes) -----
var ONGLET_PREUVES = 'Preuves', COL_PREUVES = ['id', 'numero', 'date', 'par', 'categorie', 'objet', 'lieu', 'lat', 'lng', 'precision_m', 'heure_tel', 'fichier', 'sha256', 'chaine', 'statut', 'vignette'];
var NB_PREUVE_COLS = COL_PREUVES.length - 1;
function chaineLigne_(prec, o) {
  return sha256_([prec || '', o.id, o.numero, Number(o.date), o.par, o.categorie, o.objet, o.lieu, o.lat, o.lng, o.sha256].join('|'));
}
function preuveObj_(o, thumb) {
  return { id: String(o.id), num: String(o.numero), at: Number(o.date), by: String(o.par || ''), cat: String(o.categorie || ''), obj: String(o.objet || ''), lieu: String(o.lieu || ''),
    lat: Number(o.lat) || null, lng: Number(o.lng) || null, acc: Number(o.precision_m) || null, tel: Number(o.heure_tel) || null, f: String(o.fichier), sha: String(o.sha256), chain: String(o.chaine), st: String(o.statut || ''), thumb: thumb ? String(o.vignette || '') : undefined };
}
function preuvesInfo_() {
  var s = classeur_().getSheetByName(ONGLET_PREUVES); if (!s || s.getLastRow() < 2) return { n: 0, last: 0 };
  return { n: s.getLastRow() - 1, last: Number(s.getRange(s.getLastRow(), 3).getValue()) || 0 };
}
function deposerPreuve(code, dataUrl, vign, meta, par) {
  verifier_(code);
  meta = meta || {};
  var objet = String(meta.obj || '').trim().slice(0, 120);
  if (!objet) throw new Error("Écris ce que la photo prouve (ex. « Filet n°12 posé »).");
  var img = image_(dataUrl, 6e6), sha = sha256_(img.octets), cid = /^p[a-z0-9]{6,24}$/.test(String(meta.cid || '')) ? String(meta.cid) : '';
  return verrou_(function () {
    var s = ongletCree_(ONGLET_PREUVES, COL_PREUVES, true), t = Date.now(), an = Utilities.formatDate(new Date(t), 'Europe/Zurich', 'yyyy');
    var avant = lireCols_(ONGLET_PREUVES, NB_PREUVE_COLS), der = avant[avant.length - 1];
    var deja = cid && avant.filter(function (x) { return String(x.id) === cid; })[0];
    if (deja) return { preuvesInfo: preuvesInfo_(), preuve: preuveObj_(deja, false) };
    var nAn = avant.filter(function (o) { return String(o.numero).indexOf('P-' + an + '-') === 0; }).length + 1;
    var o = { id: cid || 'p' + t.toString(36) + Math.random().toString(36).slice(2, 5), numero: 'P-' + an + '-' + ('000' + nAn).slice(-4), date: t, par: String(par || '').slice(0, 60),
      categorie: String(meta.cat || '').slice(0, 40), objet: objet, lieu: String(meta.lieu || '').slice(0, 120), lat: coord_(meta.lat), lng: coord_(meta.lng), sha256: sha };
    o.chaine = chaineLigne_(der ? String(der.chaine) : '', o);
    var nomF = o.numero + '-' + horo_(t) + '-' + sha.slice(0, 8) + '.jpg';
    var f = sousDossier_('dossier_preuves', 'Preuves (ne pas modifier)').createFile(Utilities.newBlob(img.octets, img.type, nomF));
    f.setDescription('Preuve ' + o.numero + ' · ' + objet + ' · ' + Utilities.formatDate(new Date(t), 'Europe/Zurich', 'dd.MM.yyyy HH:mm:ss') + ' (heure serveur, Europe/Zurich) · par ' + o.par + ' · SHA-256 ' + sha);
    s.appendRow([o.id, o.numero, t, o.par, o.categorie, o.objet, o.lieu, o.lat, o.lng, Math.round(Number(meta.acc)) || '', Number(meta.tel) || '', f.getId(), sha, o.chaine, '', vignette_(vign)]);
    o.fichier = f.getId(); o.precision_m = Math.round(Number(meta.acc)) || ''; o.heure_tel = Number(meta.tel) || ''; o.statut = ''; o.vignette = vignette_(vign);
    return { preuvesInfo: preuvesInfo_(), preuve: preuveObj_(o, true) };
  });
}
function listePreuves(code, avant, n, f) {
  verifier_(code);
  n = Math.min(60, Number(n) || 30); f = f || {};
  var s = classeur_().getSheetByName(ONGLET_PREUVES); if (!s || s.getLastRow() < 2) return { items: [], plus: false, cats: {} };
  var L = lireCols_(ONGLET_PREUVES, NB_PREUVE_COLS).sort(function (a, b) { return Number(b.date) - Number(a.date) || b._ligne - a._ligne; }), cats = {};
  L.forEach(function (o) { var c = String(o.categorie || ''); cats[c] = (cats[c] || 0) + 1; });
  // Filtres : secteur, jour (heure suisse), et tri par distance d'un point
  if (f.cat) L = L.filter(function (o) { return String(o.categorie || '') === String(f.cat); });
  if (f.de) L = L.filter(function (o) { return Number(o.date) >= Number(f.de); });
  if (f.a) L = L.filter(function (o) { return Number(o.date) <= Number(f.a); });
  if (f.jour) L = L.filter(function (o) { return Utilities.formatDate(new Date(Number(o.date)), 'Europe/Zurich', 'yyyy-MM-dd') === String(f.jour); });
  if (f.near && f.near.length === 2) {
    var la = Number(f.near[0]), lo = Number(f.near[1]), r = Math.PI / 180;
    L.forEach(function (o) { var a = Number(o.lat), b = Number(o.lng); o._d = a && b ? Math.round(6371000 * Math.acos(Math.min(1, Math.sin(la * r) * Math.sin(a * r) + Math.cos(la * r) * Math.cos(a * r) * Math.cos((b - lo) * r)))) : 1e12; });
    L.sort(function (x, y) { return x._d - y._d; });
  } else if (avant) L = L.filter(function (o) { return Number(o.date) < Number(avant); });
  var skip = Math.max(0, Number(f.skip) || 0), page = L.slice(skip, skip + n), lignes = page.map(function (o) { return o._ligne; });
  var vg = {}; if (lignes.length) { var a = Math.min.apply(null, lignes), b = Math.max.apply(null, lignes), v = s.getRange(a, 16, b - a + 1, 1).getValues(); lignes.forEach(function (l) { vg[l] = String(v[l - a][0] || ''); }); }
  return { items: page.map(function (o) { var p = preuveObj_(o, false); p.thumb = vg[o._ligne] || ''; if (o._d != null && o._d < 1e12) p.dist = o._d; return p; }), plus: L.length > skip + n, total: L.length, cats: cats };
}
// Toutes les preuves en version légère (sans vignette) : pour la carte et la frise des dates
function cartePreuves(code) {
  verifier_(code);
  if (!classeur_().getSheetByName(ONGLET_PREUVES)) return [];
  return lireCols_(ONGLET_PREUVES, NB_PREUVE_COLS).map(function (o) { var p = preuveObj_(o, false); delete p.thumb; return p; });
}
function marquerPreuve(code, id, raison, par) {
  verifier_(code);
  raison = String(raison || '').trim().slice(0, 120);
  if (!raison) throw new Error('Écris pourquoi cette preuve est une erreur.');
  return verrou_(function () {
    var o = lireCols_(ONGLET_PREUVES, NB_PREUVE_COLS).filter(function (x) { return String(x.id) === String(id); })[0];
    if (!o) throw new Error('Preuve introuvable.');
    var st = 'ERREUR : ' + raison + ' (' + String(par || '').slice(0, 40) + ', ' + Utilities.formatDate(new Date(), 'Europe/Zurich', 'dd.MM.yyyy HH:mm') + ')';
    onglet_(ONGLET_PREUVES).getRange(o._ligne, 15).setValue(st);
    o.statut = st; return { preuvesInfo: preuvesInfo_(), preuve: preuveObj_(o, false) };
  });
}
// Contrôle complet : recalcule l'empreinte de chaque photo dans le Drive et la chaîne du journal
function verifierPreuves(code) {
  verifier_(code);
  var L = lireCols_(ONGLET_PREUVES, NB_PREUVE_COLS), prec = '', pb = [], debut = Date.now(), vus = 0;
  L.forEach(function (o) {
    if (chaineLigne_(prec, o) !== String(o.chaine)) pb.push(o.numero + ' : ligne du journal modifiée');
    prec = String(o.chaine);
  });
  for (var i = L.length - 1; i >= 0 && Date.now() - debut < 50000; i--, vus++) {
    var o = L[i];
    try { if (sha256_(DriveApp.getFileById(String(o.fichier)).getBlob().getBytes()) !== String(o.sha256)) pb.push(o.numero + ' : photo modifiée'); }
    catch (e) { pb.push(o.numero + ' : photo introuvable dans le Drive'); }
  }
  return { n: L.length, problemes: pb, at: Date.now(), info: vus < L.length ? 'Photos contrôlées : les ' + vus + ' plus récentes sur ' + L.length + ' (relance pour le reste). Journal entier contrôlé.' : '' };
}
// Heure du serveur (pour comparer avec celle du téléphone)
function heureServeur(code) { verifier_(code); return Date.now(); }
