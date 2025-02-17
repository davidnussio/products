import React from 'react'

const Link: React.FC<any> = (props) => {
  return (
    <a
      className="focus:ring-1 focus:ring-offset-2 focus:ring-offset-background focus:ring-brand-cream rounded-sm focus:outline-none transition-all ease-in-out duration-300"
      {...props}
    >
      {props.children}
    </a>
  )
}

export {Link}
