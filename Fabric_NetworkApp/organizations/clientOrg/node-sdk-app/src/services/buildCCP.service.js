"use strict";
import { buildCCPOrg1 } from "./AppUtil.service.js";

const getCCP = (org) => {
  let ccp;
  switch (org) {
    case 1:
      ccp = buildCCPOrg1();
      break;
    case 2:
      ccp = buildCCPOrg2();
      break;
    case 3:
      ccp = buildCCPOrg3();
      break;
  }
  return ccp;
};

export { getCCP };
