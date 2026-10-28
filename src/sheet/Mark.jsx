/** הלוגו של האפליקציה (public/icon-512.png — אותו קובץ של האייקון במסך הבית). */
export default function Mark({ size = 72 }) {
  return (
    <img src="/icon-512.png" width={size} height={size} alt="כלכלת בית"
      style={{ borderRadius: size * 0.22, boxShadow: '0 6px 18px var(--shadow)', display: 'block' }} />
  )
}
