import { useEffect, useRef } from 'react';
import { Crepe } from '@milkdown/crepe';
import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';

/**
 * Typora-like live-preview markdown editor based on Milkdown Crepe.
 * Fires `onChange` with the current markdown whenever the user edits.
 */
export function CrepeEditor({
  value,
  onChange
}: {
  value: string;
  onChange: (md: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const crepeRef = useRef<Crepe | null>(null);
  // Track whether a change came from the editor (avoid feedback loop)
  const isLocalUpdate = useRef(false);
  const lastEmitted = useRef<string>(value);

  useEffect(() => {
    if (!containerRef.current) return;
    const crepe = new Crepe({
      root: containerRef.current,
      defaultValue: value
    });
    crepeRef.current = crepe;
    crepe.on(listener => {
      listener.markdownUpdated((_ctx, markdown) => {
        isLocalUpdate.current = true;
        lastEmitted.current = markdown;
        onChange(markdown);
      });
    });
    crepe.create();

    return () => {
      crepe.destroy();
      crepeRef.current = null;
    };
    // Only create once — external value updates handled separately
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If the markdown changes from outside (e.g. switching from code view),
  // reset the editor content. Skip if the update came from this editor.
  useEffect(() => {
    if (isLocalUpdate.current) {
      isLocalUpdate.current = false;
      return;
    }
    if (value === lastEmitted.current) return;
    // Recreate the editor to load the new value cleanly
    const c = crepeRef.current;
    if (!c || !containerRef.current) return;
    c.destroy();
    const fresh = new Crepe({
      root: containerRef.current,
      defaultValue: value
    });
    crepeRef.current = fresh;
    fresh.on(listener => {
      listener.markdownUpdated((_ctx, markdown) => {
        isLocalUpdate.current = true;
        lastEmitted.current = markdown;
        onChange(markdown);
      });
    });
    fresh.create();
    lastEmitted.current = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <div ref={containerRef} className="crepe-editor" />;
}
