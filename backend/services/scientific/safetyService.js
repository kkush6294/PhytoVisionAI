/*
 * safetyService.js
 * =================
 * Plant-specific evidence-backed safety, dosage, toxicity levels,
 * and precautions for PhytoVisionAI.
 *
 * Grounded strictly in published pharmacological literature and trusted
 * botanical monographs (WHO Monographs on Selected Medicinal Plants,
 * Indian Pharmacopoeia, PubChem compound safety records).
 *
 * If reliable evidence is unavailable for a plant, returns:
 * available: false with an explicit message.
 */

const PLANT_SAFETY_EVIDENCE = {
    Aloevera: {
        recommendedDosage: "Oral (gel): 100-200 mg daily or 50 ml juice daily for digestive support; Topical: apply 0.5% hydrophilic cream 3 times daily.",
        toxicityLevel: "Low for topical gel; Moderate for crude oral latex (contains aloin/anthraquinones with laxative toxicity).",
        precautions: [
            "Avoid oral consumption of unpurified latex during pregnancy and lactation due to uterine stimulant risk.",
            "Avoid long-term oral ingestion (>2 weeks) of aloe latex to prevent electrolyte depletion (hypokalemia).",
            "Discontinue prior to elective surgery due to potential antiplatelet interaction."
        ],
        safetyNotes: "Topical aloe gel is generally well-tolerated. Oral latex is contraindicated in inflammatory bowel disease (Crohn's, ulcerative colitis) and appendicitis.",
        source: "WHO Monographs on Selected Medicinal Plants (Vol 1, Aloe Vera Gel & Aloe); PubChem CID 442118 (Aloin)."
    },

    Amla: {
        recommendedDosage: "1-3 g dried fruit powder (Churna) daily, or 10-20 ml fresh juice daily.",
        toxicityLevel: "Very Low (edible fruit, rich in vitamin C and polyphenols).",
        precautions: [
            "Use with caution in individuals taking antidiabetic medication as Amla may enhance hypoglycemic effects.",
            "May increase bleeding risk when co-administered with antiplatelet/anticoagulant drugs."
        ],
        safetyNotes: "High dietary and traditional safety profile. Safe in normal food amounts during pregnancy.",
        source: "Indian Pharmacopoeia Monograph; WHO Monographs; PubChem CID 370 (Gallic acid)."
    },

    Ashwagandha: {
        recommendedDosage: "300-600 mg standardized root extract (5% withanolides) daily, or 3-6 g root powder daily.",
        toxicityLevel: "Low to Moderate at therapeutic doses; high doses may cause gastrointestinal upset.",
        precautions: [
            "Contraindicated during pregnancy due to potential abortifacient activity reported in animal studies.",
            "May stimulate thyroid hormone production; monitor patients with hyperthyroidism or Hashimoto's thyroiditis.",
            "May enhance sedation when used alongside CNS depressants or GABAergic medications."
        ],
        safetyNotes: "Well-tolerated in clinical trials up to 12 weeks. Monitor liver function during prolonged high-dose therapy.",
        source: "WHO Monographs on Selected Medicinal Plants (Vol 4); PubChem CID 265237 (Withaferin A)."
    },

    Brahmi: {
        recommendedDosage: "300-450 mg standardized extract (20-55% bacosides) daily, or 2-3 g dry powder.",
        toxicityLevel: "Low.",
        precautions: [
            "May cause mild nausea, abdominal cramps, or increased bowel frequency on an empty stomach; take with food.",
            "May cause bradycardia; monitor patients with cardiovascular disorders.",
            "Caution in patients with urinary tract obstruction or lung conditions (asthma/COPD) due to cholinergic effects."
        ],
        safetyNotes: "Non-sedative cognitive enhancer with favorable long-term safety profile in clinical trials.",
        source: "WHO Monographs on Selected Medicinal Plants (Vol 2); PubChem CID 92043329 (Bacoside A)."
    },

    Betel: {
        recommendedDosage: "1-2 fresh leaves chewed post-meal; aqueous leaf extract 50-100 mg/kg in research protocols.",
        toxicityLevel: "Low for leaf alone; High if combined with areca nut or tobacco (carcinogenic synergy).",
        precautions: [
            "Do not consume betel leaf with areca nut or slaked lime due to oral mucosal lesion and submucous fibrosis risk.",
            "Avoid excessive daily ingestion during pregnancy."
        ],
        safetyNotes: "Betel leaf contains essential oils (eugenol, hydroxychavicol) with antibacterial and antioxidant activity.",
        source: "IARC Monographs on the Evaluation of Carcinogenic Risks to Humans (Vol 85); PubChem CID 3314 (Eugenol)."
    },

    Castor: {
        recommendedDosage: "Castor oil (cold-pressed, seed-free): 15-60 ml as a single oral laxative dose for adults.",
        toxicityLevel: "HIGH TOXICITY for raw seeds (contain Ricin, a potent ribosome-inactivating protein); Low toxicity for refined castor oil (ricin is water-soluble and discarded during pressing).",
        precautions: [
            "RAW SEEDS ARE HIGHLY TOXIC AND FATAL IF CHEWED; DO NOT CONSUME RAW CASTOR SEEDS.",
            "Castor oil is CONTRAINDICATED during pregnancy as it stimulates uterine contractions and labor.",
            "Do not use castor oil in intestinal obstruction, acute abdominal conditions, or children under 12."
        ],
        safetyNotes: "Only cold-pressed, refined, ricin-free castor oil is safe for medicinal laxative use.",
        source: "FDA OTC Active Ingredient Regulation; PubChem CID 16020046 (Ricinoleic acid); CDC Emergency Preparedness (Ricin)."
    },

    Curry_Leaf: {
        recommendedDosage: "5-10 g fresh leaves daily in culinary or decoction preparation.",
        toxicityLevel: "Very Low (edible spice/herb).",
        precautions: [
            "May lower blood glucose levels; monitor diabetic patients on insulin or sulfonylureas."
        ],
        safetyNotes: "Contains carbazole alkaloids (mahanimbine) with documented hypoglycemic and hypolipidemic activity.",
        source: "Journal of Ethnopharmacology; PubChem CID 115264 (Mahanimbine)."
    },

    Doddapatre: {
        recommendedDosage: "5-10 ml fresh leaf juice or decoction (10-15 leaves boiled in water) 2 times daily.",
        toxicityLevel: "Low.",
        precautions: [
            "Essential oil contains high carvacrol/thymol; excessive concentrate may cause skin or mucosal irritation."
        ],
        safetyNotes: "Traditional respiratory and carminative remedy; rich in carvacrol and thymol.",
        source: "Indian Herbal Pharmacopoeia; PubChem CID 10864 (Carvacrol)."
    },

    Gauva: {
        recommendedDosage: "5-10 g dried leaf powder or decoction (5 leaves in 200 ml water) for anti-diarrheal support.",
        toxicityLevel: "Very Low.",
        precautions: [
            "May cause mild constipation if consumed in very high doses due to high tannin content."
        ],
        safetyNotes: "Leaf tannins and quercetin provide antibacterial and anti-diarrheal action.",
        source: "WHO Monographs on Selected Medicinal Plants; PubChem CID 5280343 (Quercetin)."
    },

    Henna: {
        recommendedDosage: "Topical application as paste for cooling/antifungal effect. ORAL INGESTION NOT RECOMMENDED.",
        toxicityLevel: "Moderate to High if ingested; topical paste is low toxicity (except G6PD-deficient individuals).",
        precautions: [
            "CONTRAINDICATED in individuals with G6PD deficiency — topical lawsone can trigger acute hemolytic anemia.",
            "Do not ingest henna leaves or powder orally.",
            "Beware of 'Black Henna' additives (p-phenylenediamine/PPD) which cause severe contact dermatitis."
        ],
        safetyNotes: "Natural pure henna (Lawsonia inermis) dye is safe topically for non-G6PD deficient individuals.",
        source: "Pediatrics & Dermatology Clinical Reports; PubChem CID 5281726 (Lawsone)."
    },

    Hibiscus: {
        recommendedDosage: "1.5-3 g dried calyces/leaves infused as tea 2-3 times daily.",
        toxicityLevel: "Low.",
        precautions: [
            "May reduce blood pressure; caution when taken with antihypertensive drugs (antihypertensive potentiation).",
            "May decrease acetaminophen bioavailability."
        ],
        safetyNotes: "Rich in anthocyanins (delphinidin, cyanidin) supporting cardiovascular and antihypertensive health.",
        source: "Journal of Nutrition / Phytomedicine; PubChem CID 6852157 (Delphinidin)."
    },

    Lemon: {
        recommendedDosage: "15-30 ml fresh juice diluted in warm water daily.",
        toxicityLevel: "Very Low (food plant).",
        precautions: [
            "Undiluted juice may cause dental enamel erosion over extended periods due to citric acid."
        ],
        safetyNotes: "Rich in vitamin C, hesperidin, and limonene.",
        source: "USDA Food Database; PubChem CID 441341 (Hesperidin)."
    },

    Lemon_grass: {
        recommendedDosage: "1-2 g dried leaves infused as tea up to 3 times daily.",
        toxicityLevel: "Low.",
        precautions: [
            "Avoid concentrated essential oil orally during pregnancy (citral possesses mild teratogenic potential in high animal doses)."
        ],
        safetyNotes: "Contains citral and geraniol with antimicrobial and spasmolytic properties.",
        source: "Phytotherapy Research; PubChem CID 638011 (Citral)."
    },

    Mint: {
        recommendedDosage: "3-6 g fresh leaves in tea or 0.2-0.4 ml peppermint oil in enteric-coated capsules.",
        toxicityLevel: "Low.",
        precautions: [
            "May worsen gastroesophageal reflux disease (GERD) and hiatal hernia by relaxing the lower esophageal sphincter."
        ],
        safetyNotes: "Menthol acts as a smooth muscle relaxant beneficial for irritable bowel syndrome (IBS).",
        source: "EMA European Medicines Agency Herbal Monograph; PubChem CID 16666 (Menthol)."
    },

    Neem: {
        recommendedDosage: "1-2 g leaf powder daily, or 5-10 ml fresh leaf juice short-term (max 2 weeks).",
        toxicityLevel: "Moderate for leaf juice/bark; High for raw seed oil in young children (Reye-like syndrome).",
        precautions: [
            "CONTRAINDICATED in infants and young children (neem oil ingestion causes toxic encephalopathy and metabolic acidosis).",
            "CONTRAINDICATED in women attempting conception or during pregnancy (documented anti-implantation and abortifacient effect).",
            "Do not use continuously for >6 weeks to prevent potential hepatotoxicity/nephrotoxicity."
        ],
        safetyNotes: "Neem leaves contain azadirachtin, nimbin, and quercetin with broad antimicrobial and immunomodulatory activity.",
        source: "WHO Monographs on Selected Medicinal Plants; PubChem CID 5281303 (Azadirachtin)."
    },

    Pappaya: {
        recommendedDosage: "5-10 ml fresh leaf extract 2 times daily for platelet support during dengue management.",
        toxicityLevel: "Low for mature leaf extract; Latex from green fruit is a potential allergen/uterine stimulant.",
        precautions: [
            "Avoid green fruit latex during pregnancy due to papain-induced uterine contraction risk.",
            "May interact with warfarin and antiplatelet drugs."
        ],
        safetyNotes: "Leaf extract contains carpaine and papain, supported by clinical trials for thrombocytopenia management.",
        source: "BMC Complementary Medicine and Therapies; PubChem CID 23724 (Carpaine)."
    },

    Pepper: {
        recommendedDosage: "300-500 mg black pepper powder or 5-20 mg bioperine (piperine) daily as bioavailability enhancer.",
        toxicityLevel: "Low.",
        precautions: [
            "Piperine inhibits CYP3A4 and P-glycoprotein, significantly increasing serum levels of co-administered prescription drugs (e.g. phenytoin, propranolol, theophylline)."
        ],
        safetyNotes: "Piperine enhances hepatic and intestinal drug bioavailability by up to 2000%.",
        source: "Planta Medica / Journal of Pharmacology; PubChem CID 638024 (Piperine)."
    },

    Pomegranate: {
        recommendedDosage: "100-250 ml juice daily, or 250-500 mg standardized extract (40% ellagic acid).",
        toxicityLevel: "Very Low (fruit); Moderate for root/stem bark (contains toxic alkaloids like pelletierine).",
        precautions: [
            "May lower blood pressure and interact with ACE inhibitors or antihypertensives.",
            "Avoid root/stem bark extracts due to neuromuscular toxicity."
        ],
        safetyNotes: "Rich in punicalagins and ellagic acid, offering potent antioxidant and cardioprotective benefits.",
        source: "Journal of Agricultural and Food Chemistry; PubChem CID 442845 (Punicalagin)."
    },

    Rose: {
        recommendedDosage: "2-4 g dried petals infused as tea 2-3 times daily.",
        toxicityLevel: "Very Low.",
        precautions: [
            "Mild laxative effect at high doses."
        ],
        safetyNotes: "Contains geraniol, citronellol, and kaempferol with mild anti-inflammatory and mild sedative properties.",
        source: "Avicenna Journal of Phytomedicine; PubChem CID 637566 (Geraniol)."
    },

    Tulasi: {
        recommendedDosage: "300-600 mg extract daily, or 2-3 g dried leaf powder / 10-15 fresh leaves as tea.",
        toxicityLevel: "Low.",
        precautions: [
            "May lower blood glucose and inhibit platelet aggregation; monitor in diabetic or surgical patients.",
            "High doses may reduce spermatogenesis based on animal studies; use caution in couples attempting conception."
        ],
        safetyNotes: "Adaptogenic herb containing eugenol, rosmarinic acid, and ursolic acid.",
        source: "Evidence-Based Complementary and Alternative Medicine; PubChem CID 3314 (Eugenol)."
    },

    Amruta_Balli: {
        recommendedDosage: "500-1000 mg standardized extract daily, or 10-20 ml stem juice daily.",
        toxicityLevel: "Low to Moderate; rare idiosyncratic hepatotoxicity reported with prolonged excessive use.",
        precautions: [
            "May lower blood glucose; monitor diabetic patients.",
            "Immunostimulatory effect: use caution in patients with autoimmune disorders (rheumatoid arthritis, lupus, MS).",
            "Monitor liver function tests (ALT/AST) during long-term supplementation."
        ],
        safetyNotes: "Contains berberine and tinosporaside with immunomodulatory and antipyretic activity.",
        source: "Journal of Ayurveda and Integrative Medicine; PubChem CID 2353 (Berberine)."
    },

    Arali: {
        recommendedDosage: "ORAL USE IS CONTRAINDICATED. EXTERNAL / TOPICAL USE ONLY UNDER STRICT MEDICAL SUPERVISION.",
        toxicityLevel: "EXTREMELY HIGH TOXICITY (FATAL POISON). Contains cardiac glycosides (oleandrin, neriin). Ingestion of even 1-2 leaves can cause fatal cardiac arrhythmias.",
        precautions: [
            "FATAL POISON: DO NOT CONSUME ANY PART OF THIS PLANT ORALLY.",
            "Ingestion causes severe vomiting, bradycardia, AV block, ventricular fibrillation, and cardiac arrest.",
            "Keep away from children and livestock.",
            "Wear gloves when handling or pruning."
        ],
        safetyNotes: "Nerium oleander is one of the most poisonous commercial garden plants. Oleandrin inhibits Na+/K+-ATPase identically to digoxin but with narrower therapeutic margin.",
        source: "CDC Chemical Safety / Toxnet Monograph; PubChem CID 441295 (Oleandrin)."
    },

    Avacado: {
        recommendedDosage: "Edible fruit flesh is consumed as food. Leaf decoction: 1-2 cups daily under herbal guidance.",
        toxicityLevel: "Fruit flesh is safe/edible; Leaves contain Persin, which is toxic to domestic animals (birds, horses, cattle, goats, dogs).",
        precautions: [
            "AVOCADO LEAVES AND BARK ARE TOXIC TO PETS AND LIVESTOCK (Persin causes myocardial necrosis and mastitis in animals).",
            "Individuals with latex allergy may experience cross-reactive latex-fruit syndrome."
        ],
        safetyNotes: "Fruit flesh is rich in healthy monounsaturated fatty acids (oleic acid) and lutein.",
        source: "ASPCA Animal Poison Control; PubChem CID 538883 (Persin)."
    },

    Bamboo: {
        recommendedDosage: "3-6 g dried leaf silica/extract or tea daily.",
        toxicityLevel: "Low for processed leaves/shoots; Raw shoots contain cyanogenic glycosides (taxiphyllin).",
        precautions: [
            "RAW BAMBOO SHOOTS MUST BE BOILED BEFORE CONSUMPTION to destroy cyanogenic glycosides."
        ],
        safetyNotes: "Leaf extracts are rich in flavone C-glycosides (orientin, vitexin) providing antioxidant support.",
        source: "Food Chemistry Monograph; PubChem CID 5281675 (Orientin)."
    },

    Basale: {
        recommendedDosage: "50-100 g cooked fresh leaves as dietary vegetable.",
        toxicityLevel: "Very Low (edible leafy vegetable).",
        precautions: [
            "Contains oxalates; individuals with history of calcium oxalate kidney stones should consume in moderation."
        ],
        safetyNotes: "Rich in betalains (gomphrenin), vitamin A, vitamin C, and iron.",
        source: "USDA Food Database; PubChem CID 44256722 (Gomphrenin)."
    },

    Betel_Nut: {
        recommendedDosage: "MEDICINAL ORAL CHEWING IS NOT RECOMMENDED.",
        toxicityLevel: "HIGH TOXICITY & CARCINOGENIC. Contains arecoline, a muscarinic agonist alkaloid.",
        precautions: [
            "Group 1 Human Carcinogen (IARC): Causes oral cavity cancer and oral submucous fibrosis.",
            "Addictive cholinergic agonist causing tachycardia, hypertension, and bronchospasm.",
            "CONTRAINDICATED during pregnancy and lactation."
        ],
        safetyNotes: "Areca nut is classified as a human carcinogen by the WHO IARC. Its use is strongly discouraged.",
        source: "IARC Monographs (Vol 85 & 100E); PubChem CID 2230 (Arecoline)."
    },

    Ekka: {
        recommendedDosage: "ORAL USE IS CONTRAINDICATED EXCEPT IN STANDARDIZED PURIFIED AYURVEDIC FORMULATIONS UNDER STRICT PHYSICIAN SUPERVISION.",
        toxicityLevel: "HIGH TOXICITY. Latex contains cardenolides (calotropin, calactin) causing severe cardiac toxicity, emesis, and corneal ulceration on contact.",
        precautions: [
            "HIGHLY TOXIC LATEX: Direct eye contact causes severe kerato-endotheliitis and blindness.",
            "Oral ingestion of latex or unpurified root bark causes severe gastrointestinal irritation and lethal cardiac arrhythmia.",
            "Keep away from eyes and skin abrasions."
        ],
        safetyNotes: "Calotropis gigantea contains cardiac glycosides similar to digitalis. External latex is traditional, but unsafe without strict purification (Shodhana).",
        source: "Journal of Medical Toxicology; PubChem CID 3662 (Calotropis / Calotropin)."
    },

    Ganike: {
        recommendedDosage: "3-5 g dried leaves cooked/boiled as vegetable, or 5-10 ml leaf juice short-term under supervision.",
        toxicityLevel: "Moderate to High for UNRIPE green berries (contain toxic glycoalkaloid Solanine); Low for fully ripe black berries and thoroughly cooked leaves.",
        precautions: [
            "DO NOT CONSUME UNRIPE GREEN BERRIES — contain lethal concentrations of solanine and solasodine.",
            "Thoroughly cook leaves before consumption to degrade thermolabile glycoalkaloids."
        ],
        safetyNotes: "Solanum nigrum contains solamargine and solasonine with investigated anti-neoplastic properties.",
        source: "Toxicological Reviews; PubChem CID 30000 (Solanine)."
    },

    Nithyapushpa: {
        recommendedDosage: "ORAL INGESTION OF RAW PLANT IS CONTRAINDICATED. Standardized vinca alkaloids (vincristine, vinblastine) are IV ONCOLOGY MEDICATIONS ONLY.",
        toxicityLevel: "HIGH TOXICITY (CYTOTOXIC POISON). Contains potent antineoplastic vinca alkaloids.",
        precautions: [
            "HIGHLY CYTOTOXIC PLANT: Raw ingestion causes severe bone marrow suppression, peripheral neuropathy, and death.",
            "CONTRAINDICATED in pregnancy, hepatic impairment, and kidney failure.",
            "IV vinca alkaloids must NEVER be administered intrathecally (fatal neurotoxicity)."
        ],
        safetyNotes: "Catharanthus roseus is the natural source of chemotherapy drugs vincristine and vinblastine. Raw self-medication is extremely dangerous.",
        source: "NCI Cancer Drug Information; PubChem CID 5978 (Vincristine) & CID 6719 (Vinblastine)."
    },

    Nooni: {
        recommendedDosage: "30-60 ml fruit juice daily on an empty stomach.",
        toxicityLevel: "Low to Moderate; potential hepatotoxicity reported in isolated cases with high-dose extracts.",
        precautions: [
            "High potassium content: CONTRAINDICATED in chronic kidney disease (CKD) and end-stage renal disease (ESRD) due to hyperkalemia risk.",
            "Monitor liver enzymes (ALT/AST) in patients with pre-existing hepatic illness."
        ],
        safetyNotes: "Contains damnacanthal and scopoletin with anti-inflammatory and antioxidant activities.",
        source: "EFSA European Food Safety Authority Journal; PubChem CID 5281416 (Damnacanthal)."
    },

    Ashoka: {
        recommendedDosage: "3-6 g dried stem bark powder (Churna) or 15-30 ml bark decoction daily.",
        toxicityLevel: "Low at therapeutic doses.",
        precautions: [
            "Use with caution during pregnancy due to uterine stimulant activity.",
            "May cause cardiac glycoside-like mild bradycardia in high doses."
        ],
        safetyNotes: "Traditional gynecological remedy containing saracin, catechins, and quercetin for menorrhagia and dysmenorrhea.",
        source: "Indian Pharmacopoeia Monograph; WHO Monographs; PubChem CID 5280343 (Quercetin)."
    },

    Geranium: {
        recommendedDosage: "1-2 g dried leaves infused as tea twice daily, or 1-2 drops essential oil diluted in carrier oil for topical use.",
        toxicityLevel: "Low for leaf tea and diluted oil; Undiluted essential oil may cause mild dermal sensitization.",
        precautions: [
            "Do not ingest undiluted essential oil.",
            "May trigger contact dermatitis in individuals sensitive to citronellol or geraniol."
        ],
        safetyNotes: "Contains citronellol and geraniol with antimicrobial and mild spasmolytic properties.",
        source: "EMA European Medicines Agency Monograph; PubChem CID 637566 (Geraniol)."
    },

    Honge: {
        recommendedDosage: "EXTERNAL TOPICAL USE ONLY (Karanja seed oil for skin lesions). ORAL INGESTION OF SEED OIL IS CONTRAINDICATED.",
        toxicityLevel: "Moderate to High toxicity for oral seed oil (contains furanoflavonoids karanjin and pongamol); Low toxicity for refined leaf wash.",
        precautions: [
            "DO NOT INGEST KARANJA SEED OIL ORALLY — causes severe emesis, gastroenteritis, and hepatotoxicity.",
            "Avoid contact with eyes."
        ],
        safetyNotes: "Pongamia pinnata seeds yield furanoflavonoids (karanjin) used topically for scabies, eczema, and psoriasis.",
        source: "Indian Pharmacopoeia Monograph; Journal of Ethnopharmacology; PubChem CID 119047 (Karanjin)."
    },

    Insulin: {
        recommendedDosage: "1-2 fresh leaves chewed raw daily, or 1-2 g dried leaf powder daily.",
        toxicityLevel: "Low.",
        precautions: [
            "Monitor blood glucose levels frequently; potential risk of additive hypoglycemia when taken alongside insulin or oral antidiabetic drugs."
        ],
        safetyNotes: "Costus igneus leaves contain corosolic acid and diosgenin, which possess documented antihyperglycemic effects.",
        source: "Journal of Clinical and Diagnostic Research; PubChem CID 73284 (Corosolic acid)."
    },

    Jasmine: {
        recommendedDosage: "2-4 g dried flowers infused as tea 2 times daily.",
        toxicityLevel: "Very Low.",
        precautions: [
            "Rare allergic hypersensitivity or headache in individuals sensitive to strong floral essential oils (linalool, benzyl acetate)."
        ],
        safetyNotes: "Jasminum auriculatum flowers contain linalool and benzyl acetate, providing mild anti-anxiety and relaxing properties.",
        source: "Pharmacognosy Reviews; PubChem CID 6549 (Linalool)."
    },

    Mango: {
        recommendedDosage: "1-2 g dried leaf powder or 5-10 fresh leaves boiled in water as tea daily.",
        toxicityLevel: "Very Low for leaf tea; Fruit sap/latex causes allergic contact dermatitis.",
        precautions: [
            "Mango tree sap/latex contains urushiol-related cardols; avoid direct skin contact with fresh stem sap.",
            "Monitor diabetic patients due to potential mild hypoglycemic action."
        ],
        safetyNotes: "Leaves are rich in mangiferin, a natural xanthone C-glucoside with strong antioxidant and anti-inflammatory properties.",
        source: "Phytotherapy Research; PubChem CID 5281647 (Mangiferin)."
    },

    Nagadali: {
        recommendedDosage: "0.5-1 g dried herb infused as tea. USE ONLY SHORT-TERM UNDER MEDICAL SUPERVISION.",
        toxicityLevel: "Moderate to High (contains furocoumarins and rutarin causing photosensitivity and uterine stimulation).",
        precautions: [
            "CONTRAINDICATED IN PREGNANCY due to powerful abortifacient and emmenagogue effects.",
            "Causes severe phytophotodermatitis (skin blistering when exposed to sunlight after handling fresh plant).",
            "Overdose causes gastrointestinal hemorrhage and renal damage."
        ],
        safetyNotes: "Ruta graveolens contains rutin, arborinine, and furocoumarins. High doses are toxic to liver and kidneys.",
        source: "WHO Monographs on Selected Medicinal Plants; EMA Monograph; PubChem CID 5280805 (Rutin)."
    },

    Raktachandini: {
        recommendedDosage: "3-5 g dried heartwood decoction daily.",
        toxicityLevel: "Low.",
        precautions: [
            "Use with caution in pregnant women due to mild emmenagogue action.",
            "May interact with anticoagulant medications due to homoisoflavonoid content."
        ],
        safetyNotes: "Caesalpinia sappan heartwood contains brazilin, a red pigment with antioxidant and vasorelaxant properties.",
        source: "Journal of Ethnopharmacology; PubChem CID 73384 (Brazilin)."
    },

    Sapota: {
        recommendedDosage: "Edible fruit flesh consumed as food. SEED KERNELS ARE CONTRAINDICATED.",
        toxicityLevel: "Fruit flesh is safe/edible; Seeds contain toxic hydrocyanic acid and saponins (causes severe vomiting).",
        precautions: [
            "DO NOT CONSUME SAPOTA SEEDS — seeds contain toxic saponin glycosides and hydrocyanic acid.",
            "Accidental seed ingestion causes severe emesis, abdominal cramps, and diarrhea."
        ],
        safetyNotes: "Fruit flesh is rich in polyphenols, ascorbic acid, and dietary fiber.",
        source: "Food Chemistry; ToxNet Monograph; PubChem CID 5280343 (Quercetin)."
    },

    Wood_sorel: {
        recommendedDosage: "5-10 g fresh leaves eaten short-term in salad or decoction.",
        toxicityLevel: "Low to Moderate (contains high concentration of soluble oxalic acid/oxalates).",
        precautions: [
            "CONTRAINDICATED in patients with kidney stones (urolithiasis), gout, rheumatoid arthritis, or hyperoxaluria.",
            "Large doses bind blood calcium, potentially causing acute oxalate toxicity."
        ],
        safetyNotes: "Oxalis corniculata contains oxalic acid, vitamin C, and flavonoids. Cooking reduces soluble oxalate content.",
        source: "Journal of Ethnopharmacology; PubChem CID 14798 (Oxalic acid)."
    }
};

function getSafetyInfo(scientificName, className) {
    if (!className && (!scientificName || scientificName === 'Unknown')) {
        return {
            available: false,
            message: "Information unavailable from retrieved scientific sources."
        };
    }

    const key = className || scientificName;
    const info = PLANT_SAFETY_EVIDENCE[key] || PLANT_SAFETY_EVIDENCE[scientificName];

    if (!info) {
        return {
            available: false,
            message: "Information unavailable from retrieved scientific sources."
        };
    }

    return {
        available: true,
        source: info.source,
        recommendedDosage: info.recommendedDosage,
        toxicityLevel: info.toxicityLevel,
        precautions: info.precautions,
        safetyNotes: info.safetyNotes,
        disclaimer: "This safety information is provided for AI-assisted research and educational purposes only and is NOT medical advice. Consult a licensed healthcare professional before using any herbal preparation."
    };
}

module.exports = {
    getSafetyInfo,
    PLANT_SAFETY_EVIDENCE
};
