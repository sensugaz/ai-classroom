FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /classroom-api classroom.go

FROM alpine:3.19
RUN apk add --no-cache ca-certificates tzdata
COPY --from=builder /classroom-api /classroom-api
COPY --from=builder /app/etc /etc
EXPOSE 8080
CMD ["/classroom-api"]
