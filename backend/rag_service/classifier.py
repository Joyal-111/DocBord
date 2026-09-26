import re
from typing import Optional

def classify_book_by_filename(filename: str) -> str:
    """
    Automatically classify a medical textbook into one of four collections:
    'anatomy', 'physiology', 'pathology', 'pharmacology'
    based on its filename.
    """
    clean_name = filename.lower().strip()

    # 1. Physiology (check before pharmacology to prevent 'medical physiology' being misclassified)
    if any(k in clean_name for k in ['physio', 'guyton', 'hall', 'ganong', 'costanzo']):
        return 'physiology'

    # 2. Pathology
    if any(k in clean_name for k in ['patho', 'harsh', 'mohan', 'robbins']):
        return 'pathology'

    # 3. Pharmacology
    if any(k in clean_name for k in ['pharm', 'lippincot', 'drug', 'therap']):
        return 'pharmacology'

    # 4. Anatomy
    if any(k in clean_name for k in ['anat', 'gray', 'netter', 'vol2a', 'snell', 'moore', 'chaurasia']):
        return 'anatomy'

    # Fallback heuristics
    if 'phys' in clean_name:
        return 'physiology'
    
    return 'anatomy'


def detect_query_domains(query: str) -> list[str]:
    """
    Determine which collection(s) are most relevant to search for a user query.
    Returns prioritized list of collections: ['anatomy', 'physiology', 'pathology', 'pharmacology'].
    """
    q = query.lower()

    # Pharmacology indicators
    pharm_keywords = [
        'drug', 'dose', 'pharmac', 'antibiotic', 'receptor', 'agonist', 'antagonist',
        'inhibitor', 'blocker', 'toxicity', 'side effect', 'mechanism of action',
        'digoxin', 'beta blocker', 'penicillin', 'aspirin', 'paracetamol', 'morphine',
        'atropine', 'adverse', 'pharmacokinetics', 'pharmacodynamics'
    ]
    if any(k in q for k in pharm_keywords):
        return ['pharmacology', 'pathology', 'physiology', 'anatomy']

    # Pathology indicators
    patho_keywords = [
        'patholog', 'disease', 'syndrome', 'carcinoma', 'cancer', 'tumor', 'itis',
        'inflammation', 'infarction', 'necrosis', 'apoptosis', 'infection',
        'tachycardia', 'ataxia', 'appendicitis', 'cirrhosis', 'ischemia', 'failure',
        'shock', 'anemia', 'edema', 'atherosclerosis', 'embolism', 'thrombosis'
    ]
    if any(k in q for k in patho_keywords):
        return ['pathology', 'physiology', 'anatomy', 'pharmacology']

    # Physiology indicators
    physio_keywords = [
        'physiolog', 'action potential', 'cardiac cycle', 'filtration', 'reabsorption',
        'hormone', 'secretion', 'reflex', 'homeostasis', 'nephron', 'synapse',
        'depolarization', 'repolarization', 'ventricular', 'conduction', 'gfr',
        'respiration', 'digestion', 'erythropoiesis', 'metabolism'
    ]
    if any(k in q for k in physio_keywords):
        return ['physiology', 'anatomy', 'pathology', 'pharmacology']

    # Anatomy indicators (default for structures/organs)
    return ['anatomy', 'physiology', 'pathology', 'pharmacology']
