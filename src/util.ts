
export function parseBoolean(v: any): boolean {
  switch (v) {
    case 'false':
      return false;
    case false:
      return false;
    case 0:
      return false;
    case null:
      return false;
    case undefined:
      return false;
    case 'true':
      return true;
    case true:
      return true;
    default: 
      return true;
  }
}

