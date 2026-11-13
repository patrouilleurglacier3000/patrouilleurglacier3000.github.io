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
var API_ = {donnees: donnees, importerDonnees: importerDonnees, photoBase64: photoBase64, mouvement: mouvement, comptage: comptage, enregistrerArticle: enregistrerArticle, supprimerArticle: supprimerArticle, ajouterPhoto: ajouterPhoto, retirerPhoto: retirerPhoto, enregistrerPrep: enregistrerPrep, cocher: cocher, validerPrep: validerPrep, supprimerPrep: supprimerPrep, creerCommande: creerCommande, prendreCommande: prendreCommande, livrerCommande: livrerCommande, supprimerCommande: supprimerCommande, ajouterRubrique: ajouterRubrique, ajouterVideo: ajouterVideo, supprimerVideo: supprimerVideo, enregistrerEvenement: enregistrerEvenement, supprimerEvenement: supprimerEvenement, enregistrerDemande: enregistrerDemande, statutDemande: statutDemande, supprimerDemande: supprimerDemande, ajouterPhotoDemande: ajouterPhotoDemande, retirerPhotoDemande: retirerPhotoDemande, enregistrerPlanning: enregistrerPlanning, enregistrerTache: enregistrerTache, prendreTache: prendreTache, terminerTache: terminerTache, rouvrirTache: rouvrirTache, supprimerTache: supprimerTache, ordonnerTaches: ordonnerTaches, ajouterPhotoTache: ajouterPhotoTache, retirerPhotoTache: retirerPhotoTache, enregistrerBilan: enregistrerBilan, supprimerBilan: supprimerBilan, enregistrerAvalanche: enregistrerAvalanche, supprimerAvalanche: supprimerAvalanche, ajouterPhotoAvalanche: ajouterPhotoAvalanche, retirerPhotoAvalanche: retirerPhotoAvalanche, enregistrerRecco: enregistrerRecco, supprimerRecco: supprimerRecco, enregistrerPanneau: enregistrerPanneau, meteoPanneau: meteoPanneau, bibleFichier: bibleFichier};
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
  return { stock: stock, lieux: lieux.map(function (l) { return { name: l.name, last: l.last }; }), preps: preps, moves: mouv, orders: cmds, formation: formation, events: events, planjour: planJour_(), taches: taches_(), zones: zones_(), bilans: bilans_(), avalanches: avalanches_(), recco: recco_(), reccoPages: reccoPages_(), panneau: panneau_(), bible: bible_(),
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
var BIBLE_FICHIERS = ['L-essentiel-des-directives-Patrouilleurs.pdf', 'Le-saviez-vous-Jurisprudence-Patrouilleurs.pdf'];
function bible_() {
  var pr = PropertiesService.getScriptProperties(), ids = {};
  try { ids = JSON.parse(pr.getProperty('bible_ids') || '{}'); } catch (e) {}
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
          fi.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          ids[f] = fi.getId();
        });
        pr.setProperty('bible_ids', JSON.stringify(ids));
      });
    } catch (e) {}
  }
  return BIBLE_FICHIERS.map(function (f) { return { f: f, id: ids[f] || '' }; });
}
// À lancer une fois depuis l'éditeur Apps Script (menu en haut : choisir « installerBible », puis ▶ Exécuter) : autorise et range les 2 PDF dans le Drive.
function installerBible() { var r = bible_(); Logger.log('Bible : ' + r.filter(function (x) { return x.id; }).length + ' PDF sur 2'); return r; }
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
