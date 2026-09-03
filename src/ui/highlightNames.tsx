import { Fragment, ReactNode } from 'react';
import styled from 'styled-components';

// Wraps every occurrence of a player name in the given text with a highlight chip.
export function highlightNames(text: string, names: (string | undefined)[]): ReactNode {
  const list = Array.from(new Set(names.filter((n): n is string => !!n && n.trim().length > 0)))
    // longest first so "Sir Yeets-a-Lot" wins over any shorter substring
    .sort((a, b) => b.length - a.length);

  if (list.length === 0) return text;

  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${list.map(esc).join('|')})`, 'g');

  return text.split(re).map((part, i) =>
    list.indexOf(part) !== -1 ? <Name key={i}>{part}</Name> : <Fragment key={i}>{part}</Fragment>
  );
}

const Name = styled.span`
  font-weight: 700;
  color: #ffd873;
  background: rgba(255, 209, 102, 0.16);
  padding: 0 5px;
  border-radius: 6px;
  white-space: nowrap;
`;

export default highlightNames;
