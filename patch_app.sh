awk '
BEGIN { skip = 0; hold = ""; }
/if \(isPierTvRoute\)/ {
  skip = 1;
  hold = $0 "\n";
  next;
}
skip {
  hold = hold $0 "\n";
  if ($0 == "  }") {
    skip = 0;
  }
  next;
}
/if \(isRoleLoading\)/ {
  print hold;
  hold = "";
}
{ print }
' src/App.tsx > src/App.tsx.new
mv src/App.tsx.new src/App.tsx
