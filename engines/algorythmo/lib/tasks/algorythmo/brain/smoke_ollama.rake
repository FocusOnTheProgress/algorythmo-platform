# frozen_string_literal: true

# Smoke test: Ollama nomic-embed-text embedding service — Day-0 manual validation.
#
# Validates that the local Ollama instance is reachable and returns 768-dim embeddings
# for 10 founder-context PT-BR queries. Reports latency (mean + p95) and any errors.
#
# MANUAL ONLY — does NOT block CI.
#
#   bundle exec rake algorythmo:brain:smoke_ollama
#
# Prerequisites:
#   - Ollama running locally at http://localhost:11434
#   - nomic-embed-text pulled: `ollama pull nomic-embed-text`

namespace :algorythmo do
  namespace :brain do
    desc 'Smoke test Ollama nomic-embed-text with 10 PT-BR founder queries (manual, no CI)'
    task :smoke_ollama do
      require 'net/http'
      require 'json'
      require 'uri'

      runner = Algorythmo::Brain::SmokeOllamaRunner.new
      runner.run
    end
  end
end

module Algorythmo
  module Brain
    # Encapsulates the smoke test logic so rubocop-friendly method definitions
    # remain inside a proper class rather than at the top level of the rake file.
    class SmokeOllamaRunner
      OLLAMA_URL   = 'http://localhost:11434/api/embeddings'
      EXPECTED_DIM = 768
      MODEL        = 'nomic-embed-text'
      OPEN_TIMEOUT = 5
      READ_TIMEOUT = 30

      QUERIES = [
        'pricing PME Algorythmo',
        'Day 1 vs M3.5',
        'tom comunicação founder',
        'objeção comum ICP',
        'lead qualifier Modeloja',
        'manu agente WhatsApp',
        'brain seed top 5 ajustes',
        'GBrain como motor',
        'wedge ajustes ingestion',
        'dream cycle dedup'
      ].freeze

      def run
        puts "\n[smoke_ollama] Modelo: #{MODEL}  |  Endpoint: #{OLLAMA_URL}\n\n"
        latencies, errors = collect_results
        print_summary(latencies, errors)
      end

      private

      def collect_results
        latencies = []
        errors    = 0
        QUERIES.each_with_index do |query, idx|
          label   = "Q#{format('%02d', idx + 1)}"
          t0      = Process.clock_gettime(Process::CLOCK_MONOTONIC)
          dim, err = embed_query(query)
          elapsed = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - t0) * 1000).round(1)
          if err
            puts "  #{label} [ERRO    ] #{query.ljust(40)} — #{err}"
            errors += 1
          else
            dim_ok = dim == EXPECTED_DIM ? 'OK' : "WARN(dim=#{dim})"
            puts "  #{label} [#{dim_ok.ljust(12)}] #{query.ljust(40)} #{elapsed}ms"
            latencies << elapsed
          end
        end
        [latencies, errors]
      end

      def embed_query(query)
        uri      = URI.parse(OLLAMA_URL)
        http     = build_http(uri)
        request  = build_request(uri, query)
        response = http.request(request)
        raise "HTTP #{response.code}" unless response.is_a?(Net::HTTPSuccess)

        parse_embedding(response.body)
      rescue StandardError => e
        [nil, e.message]
      end

      def build_http(uri)
        http = Net::HTTP.new(uri.host, uri.port)
        http.open_timeout = OPEN_TIMEOUT
        http.read_timeout = READ_TIMEOUT
        http
      end

      def build_request(uri, query)
        req = Net::HTTP::Post.new(uri.path, 'Content-Type' => 'application/json')
        req.body = JSON.generate({ model: MODEL, prompt: query })
        req
      end

      def parse_embedding(body)
        data      = JSON.parse(body)
        embedding = data['embedding']
        raise 'no embedding in response' unless embedding.is_a?(Array)

        [embedding.length, nil]
      end

      def print_summary(latencies, errors)
        puts "\n--- Resumo ---"
        if latencies.empty?
          puts "  Nenhuma query bem-sucedida. #{errors} erro(s)."
          return
        end
        sorted = latencies.sort
        mean   = (latencies.sum / latencies.size).round(1)
        p95    = sorted[(sorted.size * 0.95).ceil - 1].round(1)
        puts "  Queries OK:      #{latencies.size}/#{latencies.size + errors}"
        puts "  Erros:           #{errors}"
        puts "  Latência média:  #{mean}ms"
        puts "  Latência p95:    #{p95}ms"
        puts "  Dim esperado:    #{EXPECTED_DIM}"
        puts errors.positive? ? "\n  [FAIL] Corrija erros antes do Day-0." : "\n  [OK] Ollama pronto para o Brain MVP."
      end
    end
  end
end
