/**
 * Formate une date en français
 * @param date La date à formater
 * @returns La date formatée en chaîne de caractères (ex: "15 janvier 2023")
 */
export function formatDate(date: Date): string {
    const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
}
