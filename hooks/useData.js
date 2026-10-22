// Loads data for a screen and loads it again every time the screen comes back
// into view, so lists and totals are always fresh after adding, editing or
// paying something on another screen.
//
// Usage:
//   const { data, loading, error, refreshing, refresh } = useData(() => store.dashboard());
//   // pass `deps` (like useEffect) when the loader uses changing values:
//   useData(() => store.payments.list({ status }), [status]);
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

export function useData(loader, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Always call the newest version of `loader` (it may use new filter values).
  const loaderRef = useRef(loader);
  useEffect(() => {
    loaderRef.current = loader;
  });

  const load = useCallback(async ({ pullToRefresh = false } = {}) => {
    if (pullToRefresh) setRefreshing(true);
    try {
      setData(await loaderRef.current());
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Runs when the screen gains focus (including the first time).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Load again when the dependencies change (e.g. a filter), but not on first render.
  const depsKey = JSON.stringify(deps);
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    load();
  }, [depsKey, load]);

  const refresh = useCallback(() => load({ pullToRefresh: true }), [load]);
  const reload = useCallback(() => load(), [load]);

  return { data, setData, error, loading, refreshing, refresh, reload };
}
