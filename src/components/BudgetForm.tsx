const [form, setForm] = useState(DEFAULT_FORM);

useEffect(() => {
  if (initialPayload) {
    const raw = typeof initialPayload === "string" ? JSON.parse(initialPayload) : initialPayload;
    setForm((prev) => ({ ...prev, ...raw })); // se precisar, faça um deepMerge
  }
}, [initialPayload]);
