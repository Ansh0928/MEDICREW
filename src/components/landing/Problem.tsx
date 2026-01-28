"use client";

import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Clock, MapPin, HelpCircle, DollarSign } from "lucide-react";

const problems = [
  {
    icon: <Clock className="w-6 h-6" />,
    stat: "4-6 weeks",
    title: "Average specialist wait time",
    description: "In Australia, waiting for a specialist appointment can take months.",
  },
  {
    icon: <MapPin className="w-6 h-6" />,
    stat: "7M+",
    title: "Australians in rural areas",
    description: "Limited access to healthcare specialists outside major cities.",
  },
  {
    icon: <HelpCircle className="w-6 h-6" />,
    stat: "65%",
    title: "Unsure when to seek care",
    description: "Most people don't know if their symptoms need urgent attention.",
  },
  {
    icon: <DollarSign className="w-6 h-6" />,
    stat: "$400+",
    title: "Average specialist visit cost",
    description: "Out-of-pocket costs can be a barrier to getting the right care.",
  },
];

export function Problem() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Healthcare access shouldn't be this hard
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Millions of Australians face barriers to getting timely, quality healthcare guidance.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {problems.map((problem, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-6 h-full hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
                  {problem.icon}
                </div>
                <div className="text-3xl font-bold text-primary mb-2">
                  {problem.stat}
                </div>
                <h3 className="font-semibold mb-2">{problem.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {problem.description}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
