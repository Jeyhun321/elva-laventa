import { IconStar } from './Icons.jsx'

export default function Rating({ value = 0, reviews, showCount = true, reviewsLabel }) {
  return (
    <span className="rating" aria-label={`${value} / 5`}>
      <span className="rating-stars" style={{ '--fill': `${(value / 5) * 100}%` }}>
        <span className="rating-bg">
          <IconStar /><IconStar /><IconStar /><IconStar /><IconStar />
        </span>
        <span className="rating-fg">
          <IconStar /><IconStar /><IconStar /><IconStar /><IconStar />
        </span>
      </span>
      <b>{value.toFixed(1)}</b>
      {showCount && reviews != null && (
        <small>
          {reviews} {reviewsLabel}
        </small>
      )}
    </span>
  )
}
