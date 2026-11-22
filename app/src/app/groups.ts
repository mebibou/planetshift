import { ANIMAL_GROUPS, PLANT_GROUPS } from '../data/types';
import type { GroupChoice } from '../map/layers';

export const GROUP_CHOICES: GroupChoice[] = ['all', ...ANIMAL_GROUPS, ...PLANT_GROUPS];
