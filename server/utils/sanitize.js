export const sanitizeSalarie = (salarie) => {
  const salarieJson = salarie.toJSON ? salarie.toJSON() : salarie;
  delete salarieJson.password;
  delete salarieJson.date_fin;
  delete salarieJson.date_debut;
  return salarieJson;
};