// For demo, allowed guesses and answers share one list. Swap this list in production.
export const WORDS = [
  'adobe','aisle','align','alloy','anvil','axles','beams','bench','bends','brace','brads','brick','build','built','cable',
  'carry','caulk','chain','chalk','clamp','clean','clear','crane','crimp','drain','drill','drive','ducts','earth','embed',
  'erect','fence','fiber','field','flame','floor','flush','forge','frame','gauge','grade','grain','grout','guard','guide',
  'hoist','joist','joint','laser','layer','level','lever','loads','mason','metal','meter','mixer','molds','nails','paint',
  'panel','parts','patch','paver','phase','plank','plane','plant','plate','plumb','power','prime','proof','rivet','roads',
  'robot','route','sawed','scale','screw','sheet','shift','shore','slope','solid','space','spall','spike','stack','stage',
  'stake','steel','stone','strap','studs','sweep','swing','taper','terra','tools','torch','tower','track','trade','trail',
  'train','truck','truss','tubes','valve','vapor','vents','vinyl','walls','waste','water','welds','wheel','wires','woods',
  'works','yards','zones'
] as const;

export const ANSWERS = WORDS;
export const ALLOWED_GUESSES = new Set(WORDS);
