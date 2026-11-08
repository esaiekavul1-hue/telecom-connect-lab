# Registre de vérification scientifique — TELECOM CONNECT LAB 2.0

Consultation : 8 novembre 2026. Une source figure ici seulement si elle a réellement été ouverte.
Trois niveaux de preuve sont distingués :

- **S** : valeur ou formule lue dans le document cité.
- **C** : établie par le calcul, puis contrôlée par un test numérique automatique (`tests/run-content-tests.js`).
- **R** : connaissance générale de cours, sans source ouverte pendant ce travail. À relire par un enseignant.

Aucun contenu n'a été relu par un enseignant. Aucune mesure n'a été faite sur du matériel réel.

## Normes, spécifications et fiches techniques lues

| Document | Valeurs retenues | Module |
|---|---|---|
| ETSI TS 138 211 V16.2.0 (3GPP) | Δf = 2^µ · 15 kHz ; 14 symboles par créneau en préfixe normal ; 2^µ créneaux par sous-trame | 5g |
| ETSI TS 138 306 V16.1.0 (3GPP) §4.1.2 | Débit max (Mbit/s) = 10⁻⁶ · v · Qm · f · Rmax · (N_PRB · 12 / Ts) · (1 − OH) ; Rmax = 948/1024 ; Ts = 10⁻³/(14 · 2^µ) ; OH = 0,14 FR1 DL, 0,18 FR2 DL, 0,08 FR1 UL, 0,10 FR2 UL | 5g |
| ETSI TS 138 101-1 V16.5.0, table 5.3.2-1 | N_RB : 15 kHz → 25/52/79/106/133/160/216/270 (5 à 50 MHz) ; 30 kHz → 11/24/38/51/65/78/106/133/162/189/217/245/273 (5 à 100 MHz). La mise en page extraite mélange les libellés ; les valeurs concordent avec les largeurs | 5g |
| ETSI EN 300 220-2 V3.2.1 | Le cycle d'émission dépend de la sous-bande : 868,7-869,2 MHz : 25 mW e.r.p., 0,1 % ou accès poli ; 869,4-869,65 MHz : 1 % ou accès poli | iot-com |
| Semtech SX1276/77/78/79, §4.1.1.7 | Tpreamble = (n + 4,25) Ts ; n_payload = 8 + max(⌈(8PL − 4SF + 28 + 16CRC − 20IH) / (4(SF − 2DE))⌉ (CR + 4), 0) ; SF 6 à 12 ; SNR limite −5 à −20 dB selon SF ; sensibilité −111 à −148 dBm | iot-com |
| OASIS MQTT 3.1.1 | QoS 0/1/2 et paquets associés ; jokers + et # ; interdits dans un nom de topic publié ; message retenu ; testament ; Keep Alive × 1,5 ; ports 1883 et 8883 | iot-mqtt |
| OASIS MQTT 5.0 | Trois niveaux de QoS confirmés dans le résumé ; Will Delay Interval nommé. Lecture partielle | iot-mqtt |
| Espressif ESP32 Series Datasheet v5.3 | ADC SAR 12 bits jusqu'à 18 canaux ; deep-sleep 10 µA ; jusqu'à 240 MHz ; RX Wi-Fi 95-100 mA ; TX 802.11b 1 Mbit/s +19,5 dBm 240 mA ; g 54 Mbit/s 190 mA ; n MCS7 180 mA ; TX BLE 0 dBm 130 mA ; broches : environ 40 mA en sortie haute et 28 mA en sortie basse, typiques | iot-intro, iot-energie |
| Microchip ATmega328P | ADC 10 bits ; flash 32 Ko ; SRAM 2 Ko ; EEPROM 1 Ko ; 16 MHz ; 40 mA maximum absolu par broche | iot-intro |
| Arduino UNO R3 (docs.arduino.cc) | Basée sur ATmega328P, 6 entrées analogiques, 16 MHz | iot-intro |
| NIST IR 8259A | Socle : identification, configuration, protection des données, accès logique aux interfaces, mise à jour logicielle, connaissance de l'état de cybersécurité | iot-energie |
| NIST SP 800-145 | 5 caractéristiques essentielles, 3 modèles de service, 4 modèles de déploiement | cloud |
| TI LM741 (SNOSC25D) | Pente 0,5 V/µs ; gain 200 V/mV ; excursion ±14 V (±15 V, RL ≥ 10 kΩ) ; Ri 2 MΩ ; bande 1,5 MHz (LM741A) | aop |
| Vishay 1N4001-1N4007 | VRRM 1000 V (1N4007) ; IF(AV) 1 A ; IFSM 30 A ; VF max 1,1 V à 1 A | diodes |
| Vishay 1N4728A-1N4761A | 1N4733A : 5,1 V à 49 mA ; IZM 178 mA | diodes |
| onsemi BC546/547/548 | BC547 : VCEO 45 V ; IC 100 mA ; 625 mW ; hFE 110-800 à 2 mA ; VCE(sat) 0,09-0,25 V à 10 mA ; VBE(on) 0,55-0,7 V à 2 mA | transistors |
| TI LM340/LM7805 (SNOSBT0L) | Chute 2 V à 1 A, 25 °C ; entrée continue max 35 V | diodes |
| RFC 9293 (TCP) | Ouverture en trois temps ; FIN = plus de données ; rend RFC 793 obsolète | reseaux-info |
| RFC 1035 (DNS) | Types A, NS, CNAME, MX ; UDP ≤ 512 octets | reseaux-info |
| RFC 9110 (HTTP) | Classes 1xx-5xx ; 200, 301, 404, 500, 503 ; GET sûr | reseaux-info |
| RFC 2131 (DHCP), RFC 792 (ICMP), RFC 1918 (privé) | DISCOVER/OFFER/REQUEST/ACK ; echo types 8 et 0 ; 10/8, 172.16/12, 192.168/16 | reseaux-info, maintenance |
| RFC 3629 (UTF-8) | Table de longueur de 1 à 4 octets | binaire |
| NIST, préfixes binaires | Kibi = 2¹⁰ ; 1 kbit = 1000 bit ; 1 MiB = 1 048 576 B | binaire |
| CISA, Data Backup Options | Règle 3-2-1 | maintenance |

## Support universitaire lu

| Document | Valeurs retenues | Module |
|---|---|---|
| OSTEP, Scheduling: Introduction | T_turnaround, T_response ; FIFO 110 s ; SJF 50 s sur l'exemple A=100, B=C=10 | systemes |
| OSTEP, TLBs | Cache matériel des traductions d'adresses | systemes |
| OSTEP, File System Implementation | Inode, table d'inodes | systemes |
| OSTEP, RAID | Capacités N·B, (N·B)/2, (N−1)·B, (N−1)·B | maintenance |

## Pages de référence secondaires (Wikipédia, formules lues)

Électronique : Shockley (V_T ≈ 25,852 mV à 300 K), MOSFET (triode, saturation, gm), Wien (f = 1/(2πRC), gain 3), RLC (ω₀, Q, bande passante),
Thévenin, transfert maximal, Sallen-Key, ROS et coefficient de réflexion, return loss, ligne de transmission (Zin), adaptation en L, émetteur commun, polarisation, redresseur, ondulation, slew rate, GBWP, thermistance, MLI.

Numérique et télécoms : Erlang B, ALOHA, Friis (bruit), Johnson-Nyquist, Shannon-Hartley, BPSK et QPSK, Hamming(7,4), orbite géostationnaire, Kepler, constante géocentrique, canaux WLAN, CSMA/CA, OFDM, CDMA, disponibilité, diagramme de l'œil, EVM, onde carrée, bilan de liaison, C/N₀, G/T, facteur de bruit, Doppler, échantillonnage, quantification, codes en ligne, CRC, MIMO, formation de faisceau, découpage en tranches, adders, bascule D, De Morgan.

Informatique et IoT : complément à deux, double précision, von Neumann, cycle d'instruction, ACID, normalisation, modèle relationnel, hyperviseurs, conteneurs, POST, temps d'accès moyen, OSI, ARP, traceroute, Round Robin, Bluetooth Low Energy, LoRaWAN, NB-IoT, hystérésis, moyenne glissante.

## Sources demandées mais non obtenues

| Source | Résultat | Traitement |
|---|---|---|
| ITU-R P.525-4 (lien utilisé) | 404 | Affaiblissement en espace libre confirmé par la page Bilan de liaison ; le module V1 existant n'a pas été modifié |
| Analog Devices MT-001, MT-015 | Délai dépassé | SNR 6,02N + 1,76 dB lu sur la page Quantification et contrôlé par simulation (C) |
| onsemi 2N7000 | Page d'index sans la fiche | Le laboratoire utilise un MOSFET générique, sans référence commerciale |
| OWASP IoT Top 10 2018 | PDF 404 | Non cité ; le socle NIST IR 8259A est utilisé à la place |

## Formules non trouvées dans le texte lu : statut C ou R

| Formule | Statut | Contrôle |
|---|---|---|
| BER M-QAM Gray ≈ (4/log₂M)(1−1/√M) Q(√(3 log₂M/(M−1) · Eb/N0)) | C | Comparée à une simulation de Monte-Carlo |
| gm = Ic / V_T | C | Dérivée de l'équation de Shockley, contrôlée numériquement |
| Bande Nyquist (1+α)Rs/2 | R | Absente de la page lue |
| C/N₀ = EIRP − L + G/T − 10 log₁₀ k, k = −228,6 dBW/K/Hz | C | Calcul de 10 log₁₀(1,380649·10⁻²³) ; bilan testé |
| −174 dBm/Hz à 290 K | C | 10 log₁₀(k · 290 / 1 mW) testé |
| LTE : 15 kHz, 12 sous-porteuses, 1 ms | C | Numérologie µ = 0 de TS 38.211, identique au principe LTE ; LTE lui-même non confirmé |
| Classes LoRaWAN A/B/C | R | Seule la classe B est confirmée par la page lue |
| Trois canaux d'annonce BLE | R | Résumé seulement |

## Tests numériques effectués

- `tests/run-content-tests.js` : pour chaque module, valeurs limites (min, max, 60 tirages), absence de valeur invalide, mission réalisable et non acquise au départ, corrigé accepté et mauvaise réponse refusée.
- `tests/content-references.js` : 53 cas de référence, calculés à la main ou lus dans les documents ci-dessus. Exemples : Thévenin comparé au solveur nodal sur 40 circuits ; SNR de quantification mesuré ; BER 16-QAM contre Monte-Carlo (1,6 million de bits) ; Hamming(7,4) exhaustif ; Erlang B contre la somme directe ; exemple OSTEP 110 s et 50 s ; topics MQTT de la spécification ; temps d'antenne LoRa recalculé.
- Toutes les figures techniques ont été contrôlées visuellement sur une planche. Cette relecture a corrigé le pont de Graetz, le raccordement du transistor et l'échelle R-2R.

## Écart constaté

Un calculateur tiers vu en recherche annonçait 2 793,472 ms pour 59 octets en SF12. La formule de la fiche Semtech, calculée à la main, donne 2 629,632 ms (68 symboles de charge). Les hypothèses du calculateur sont inconnues : la plateforme applique la formule de la fiche.

## Statut par domaine

| Domaine | Modules ajoutés | Niveau de preuve |
|---|---|---|
| Électronique | ac, analyse, diodes, transistors, aop, logique, can, mesures, rf | S et C ; lois de circuits en R pour les énoncés généraux |
| Télécommunications | fourier, numerique, multiplexage, qualite, satellite, 5g, sans-fil, ingenierie | S et C ; 5G NR en S (3GPP) |
| Informatique | binaire, ordinateur, systemes, reseaux-info, donnees, cloud, maintenance | S (RFC, NIST, OSTEP) et R pour les descriptions générales |
| IoT | iot-intro, iot-capteurs, iot-com, iot-mqtt, iot-energie, iot-projets | S (fiches, OASIS, NIST) et C ; le modèle thermique de la serre est illustratif |

Les 10 modules V1 n'ont pas été revérifiés ici, sauf par leurs tests existants.

## Laboratoires complémentaires

Oscillateur de Wien : formules déjà sourcées. Multimètre : valeurs calculées, précision d'exemple. Organisation des fichiers : principe de l'inode (OSTEP). Routage à vecteur de distance : statut R, comparé par test aux plus courts chemins (C).

## Réserves

- Wikipédia sert de contrôle de formule, non d'autorité. Les fiches techniques et normes priment.
- Les limites de chaque modèle sont écrites sur la page du laboratoire concerné.
- Les règles radio (cycle d'émission, puissance) varient selon les pays : le texte renvoie à la réglementation locale, notamment en RDC.
