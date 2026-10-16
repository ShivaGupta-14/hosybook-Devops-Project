{{- define "hosybook.labels" -}}
app.kubernetes.io/part-of: hosybook
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "hosybook.dbUrl" -}}
postgresql+psycopg://{{ .Values.postgres.username }}:{{ .Values.postgres.password }}@hosybook-postgres:5432/{{ .Values.postgres.database }}
{{- end }}
