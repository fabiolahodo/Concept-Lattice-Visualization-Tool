import sys
import json
from concepts import Context

# Entry point for the lattice computation script
def main():

    # Step 1: Read structured JSON input from stdin
    data = json.load(sys.stdin)
    objects = data['objects']
    properties = data['properties']
    context_matrix = data['context']

    # Step 2: Build context for user data
    ctx = Context(objects, properties, context_matrix)

    # Step 3: Force lattice computation and collect concepts
    lattice = ctx.lattice
    print(f"Lattice computed: {len(lattice)} concepts.", file=sys.stderr)

    # Step 4: Prepare index mappings
    obj_list = list(ctx.objects)
    prop_list = list(ctx.properties)
    concept_to_index = {c: i for i, c in enumerate(lattice)}

    # Step 5: Serialize each concept as a 4-tuple (extent, intent, children, parents)
    lattice_serialized = [
        [
            [obj_list.index(o) for o in c.extent],       # extent indices
            [prop_list.index(p) for p in c.intent],      # intent indices
            [concept_to_index[u] for u in c.upper_neighbors],  # children
            [concept_to_index[l] for l in c.lower_neighbors]   # parents
        ]
        for c in lattice
    ]

    # Step 6: Output full serialized structure as JSON
    print(json.dumps({
        "objects": obj_list,
        "properties": prop_list,
        "context": context_matrix,
        "lattice": lattice_serialized
    }))

# Run the main function when the script is executed directly
if __name__ == "__main__":
    main()
