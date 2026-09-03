#!/bin/bash
cat << 'REPLACE' > tmp_sed.txt
  const [weather, setWeather] = useState<{ temp?: number; desc?: string; error?: boolean } | null>(null);
REPLACE
